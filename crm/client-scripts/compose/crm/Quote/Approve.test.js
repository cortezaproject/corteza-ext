import path from 'path'
import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'
import { stub, restore } from 'sinon'
import { corredor, apiClients, compose } from '@cortezaproject/corteza-js'
import Approve from './Approve'
const { Record, getModuleFromYaml } = compose
const { ComposeHelper, SystemHelper } = corredor
const ComposeAPI = apiClients.Compose
const SystemAPI = apiClients.System

describe(__filename, () => {
  let h, s, ui
  const modulesYaml = path.join(__dirname, '../../../../', 'config', '1100_modules.yaml')
  const recordID = '1'

  const quoteModule = getModuleFromYaml('Quote', modulesYaml)
  const quoteRecord = new Record(quoteModule)
  quoteRecord.recordID = recordID
  quoteRecord.createdBy = recordID
  quoteRecord.values = {
    Status: 'In Review',
    Name: 'Name',
  }

  const newQuoteRecord = new Record(quoteModule)
  newQuoteRecord.recordID = recordID
  newQuoteRecord.createdBy = recordID
  newQuoteRecord.values = {
    Status: 'Approved',
    Name: 'Name',
  }

  const user = {
    email: 'mail'
  }

  const page = {
    pageID: '1'
  }

  const frontendBaseURL = 'https://latest.cortezaproject.org'

  beforeEach(() => {
    h = stub(new ComposeHelper({ ComposeAPI: new ComposeAPI({}) }))
    s = stub(new SystemHelper({ ComposeAPI: new SystemAPI({}) }))
    ui = stub({ 
      success: () => {},
      warning: () => {},
      gotoRecordEditor: () => {},
      getRecordPage: () => {}
    })
  })

  afterEach(() => {
    restore()
  })

  describe('successful quote approve', () => {
    it('should successfully approve quote', async () => {
      h.saveRecord.resolves(newQuoteRecord)
      s.findUserByID.resolves(user)
      ui.getRecordPage.resolves(page)

      await Approve.exec({ $record: quoteRecord }, { Compose: h, ComposeUI: ui, System: s, frontendBaseURL })

      expect(h.saveRecord.calledOnceWith(newQuoteRecord)).true
      expect(s.findUserByID.calledOnceWith(newQuoteRecord.createdBy)).true

      const to = user.email
      const subject = `Quote "${quoteRecord.values.Name}" has been approved`
      const html = { html: `The following quote has been approved: <br><br><a href="${frontendBaseURL}/compose/ns/crm/pages/${page.pageID}/record/${quoteRecord.recordID}/edit">${quoteRecord.values.Name}<a>` }
      expect(h.sendMail.calledOnceWith(to, subject, html )).true
      expect(ui.success.calledOnceWith('The quote has been approved and the quote owner has been notified via email.')).true
    })

    it('should inform if quote status is not "In Review"', async () => {
      await Approve.exec({ $record: newQuoteRecord }, { Compose: h, ComposeUI: ui, System: s, frontendBaseURL })
      
      expect(ui.warning.calledOnceWith('A quote needs to have the status In Review in order to be approved.')).true
    })
  })

  describe('error handling', () => {
    it('should throw error if frontendBaseURL is missing', async () => {
      expect(async () => await Approve.exec({ $record: quoteRecord }, { Compose: h, ComposeUI: ui, System: s })).throws
    })

    it('should throw error if saveRecord throws', async () => {
      h.saveRecord.throws()

      expect(async () => await Approve.exec({ $record: quoteRecord }, { Compose: h, ComposeUI: ui, System: s, frontendBaseURL })).throws
    })

    it('should throw error if findUserByID throws', async () => {
      h.saveRecord.resolves(newQuoteRecord)
      s.findUserByID.throws()

      expect(async () => await Approve.exec({ $record: quoteRecord }, { Compose: h, ComposeUI: ui, System: s, frontendBaseURL })).throws
    })

    it('should throw error if getRecordPage throws', async () => {
      h.saveRecord.resolves(newQuoteRecord)
      s.findUserByID.resolves(user)
      ui.getRecordPage.throws()

      expect(async () => await Approve.exec({ $record: quoteRecord }, { Compose: h, ComposeUI: ui, System: s, frontendBaseURL })).throws
    })

    it('should throw error if sendMail throws', async () => {
      h.saveRecord.resolves(newQuoteRecord)
      s.findUserByID.resolves(user)
      ui.getRecordPage.resolves(page)
      h.sendMail.throws()

      expect(async () => await Approve.exec({ $record: quoteRecord }, { Compose: h, ComposeUI: ui, System: s, frontendBaseURL })).throws
    })
  })
})
