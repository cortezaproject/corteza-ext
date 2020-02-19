import path from 'path'
import { describe, it, beforeEach } from 'mocha'
import { expect } from 'chai'
import { stub } from 'sinon'
import { corredor, apiClients, compose } from '@cortezaproject/corteza-js'
import InformContact from './InformContact'
const { Record, getModuleFromYaml } = compose
const { ComposeHelper } = corredor
const ComposeAPI = apiClients.Compose

describe(__filename, () => {
  let h,ui

  const modulesYaml = path.join(__dirname, '..', '..', '..', '..', 'config', '1100_modules.yaml')
  const recordID = '1'
  
  const caseModule = getModuleFromYaml('Case', modulesYaml)
  const caseRecord = new Record(caseModule)
  caseRecord.recordID = recordID
  caseRecord.values = {
    Name: 'CaseName',
    CaseNumber: '1',
    Subject: 'Subject',
    Status: 'Closed',
    SuppliedEmail: 'john.doe@mail.com',
    SolutionName: 'SolutionName',
    SolutionNote: 'SolutionNote',
    QuoteNumber: '1'
  }

  beforeEach(() => {
    h = stub(new ComposeHelper({ ComposeAPI: new ComposeAPI({}) }))
    ui = stub({ 
      success: () => {},
      warning: () => {},
      gotoRecordEditor: () => {}
    })
  })

  describe('succesful inform', () => {
    it('should successfully inform contact with case solution', async () => {
      const to = caseRecord.values.SuppliedEmail
      const subject = `Corteza - Quote: ${caseRecord.values.QuoteNumber} - ${caseRecord.values.Name}`
      let html = '<h1>Solution of case: ' + caseRecord.values.CaseNumber + ' - ' + caseRecord.values.Subject + '</h1>'
      html = html + '<br>'
      html = html + '<strong>Solution Title:</strong> ' + caseRecord.values.SolutionName + '<br>'
      html = html + '<strong>Solution Details:</strong> ' + caseRecord.values.SolutionNote

      await InformContact.exec({ $record: caseRecord }, { Compose: h, ComposeUI: ui })

      expect(h.sendMail.calledOnceWith(to, subject, { html })).true
      expect(ui.success.calledOnceWith('The case solution has been sent via email.')).true
    })
  })

  
  describe('error handling', () => {
    it('should throw error if sendMail throws', async () => {
      h.sendMail.throws()
      
      expect(async () => await InformContact.exec({ caseRecord: caseRecord }, { Compose: h, ComposeUI: ui })).throws
    })
  })

  describe('Warning', () => {
    it('should throw error if case status is not "Closed"', async () => {
      caseRecord.values.Status = 'Open'

      await InformContact.exec({ $record: caseRecord }, { Compose: h, ComposeUI: ui })

      expect(ui.warning.calledOnceWith('You can only inform the client of a solution when the case status is "Closed".')).true
      caseRecord.values.Status = 'Closed'
    })

    it('should throw error if no email address', async () => {
      caseRecord.values.SuppliedEmail = undefined

      await InformContact.exec({ $record: caseRecord }, { Compose: h, ComposeUI: ui })

      expect(ui.warning.calledOnceWith('There is no supplied email. Please fill in an email address in the supplied email field.')).true
      caseRecord.values.SuppliedEmail = 'john.doe@mail.com'
    })
  })
})
