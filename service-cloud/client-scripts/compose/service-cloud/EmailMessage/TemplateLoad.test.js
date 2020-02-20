import path from 'path'
import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'
import { stub, restore } from 'sinon'
import { corredor, apiClients, compose } from '@cortezaproject/corteza-js'
import TemplateLoad from './TemplateLoad'
const { Record, getModuleFromYaml } = compose
const { ComposeHelper } = corredor
const ComposeAPI = apiClients.Compose

describe(__filename, () => {
  let h,ui
  const modulesYaml = path.join(__dirname, '../../../../', 'config', '1100_modules.yaml')
  const recordID = '1'
  
  TemplateLoad.procTemplate = () => {
    return 'Test'
  }

  const settingsModule = getModuleFromYaml('Settings', modulesYaml)
  const settingsRecord = new Record(settingsModule)
  settingsRecord.recordID = recordID
  settingsRecord.values = {
    DefaultCaseEmailTemplate: '1',
  }

  const caseModule = getModuleFromYaml('Case', modulesYaml)
  const caseRecord = new Record(caseModule)
  caseRecord.recordID = recordID
  caseRecord.values = {
    ContactId: '1',
  }

  const emailMessageModule = getModuleFromYaml('EmailTemplate', modulesYaml)
  const emailMessageRecord = new Record(emailMessageModule)
  emailMessageRecord.values = {
    EmailTemplateId: 'EmailTemplateId',
    ContactId: 'ContactId',
    CaseId: 'CaseId',
    Subject: TemplateLoad.procTemplate(),
    HtmlBody: TemplateLoad.procTemplate(),
  }

  const contactModule = getModuleFromYaml('Contact', modulesYaml)
  const contactRecord = new Record(contactModule)

  beforeEach(() => {
    h = stub(new ComposeHelper({ ComposeAPI: new ComposeAPI({}) }))
    ui = stub({ 
      success: () => {},
      warning: () => {},
      gotoRecordEditor: () => {}
    })
  })

  afterEach(() => {
    restore()
  })

  describe('successful case email creation', () => {
    it('should successfully create an email from case', async () => {
      h.findRecordByID.onCall(0).resolves(emailMessageRecord)
      h.findRecordByID.onCall(1).resolves(contactRecord)
      h.findRecordByID.onCall(2).resolves(caseRecord)
      h.saveRecord.resolves(emailMessageRecord)

      await TemplateLoad.exec({ $record: emailMessageRecord }, { Compose: h, ComposeUI: ui })
      
      expect(h.findRecordByID.getCall(0).calledWith(emailMessageRecord.values.EmailTemplateId, 'EmailTemplate')).true
      expect(h.findRecordByID.getCall(1).calledWith(emailMessageRecord.values.ContactId, 'Contact')).true
      expect(h.findRecordByID.getCall(2).calledWith(emailMessageRecord.values.CaseId, 'Case')).true
      expect(h.saveRecord.calledOnceWith(emailMessageRecord)).true
      expect(ui.success.calledOnceWith('The template has been loaded in to the email.')).true
      expect(ui.gotoRecordEditor.calledOnceWith(emailMessageRecord)).true
    })
  })

  describe('error handling', () => {
    it('should throw error if findRecordByID 1 throws', async () => {
      h.findRecordByID.onCall(0).throws()

      expect(async () => await TemplateLoad.exec({ $record: emailMessageRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if findRecordByID 2 throws', async () => {
      h.findRecordByID.onCall(0).resolves(emailMessageRecord)
      h.findRecordByID.onCall(1).throws()

      expect(async () => await TemplateLoad.exec({ $record: emailMessageRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if findRecordByID 3 throws', async () => {
      h.findRecordByID.onCall(0).resolves(emailMessageRecord)
      h.findRecordByID.onCall(1).resolves(contactRecord)
      h.findRecordByID.onCall(2).throws()

      expect(async () => await TemplateLoad.exec({ $record: emailMessageRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if saveRecord throws', async () => {
      h.findRecordByID.onCall(0).resolves(emailMessageRecord)
      h.findRecordByID.onCall(1).resolves(contactRecord)
      h.findRecordByID.onCall(2).resolves(caseRecord)
      h.saveRecord.throws()

      expect(async () => await TemplateLoad.exec({ $record: emailMessageRecord }, { Compose: h, ComposeUI: ui })).throws
    })
  })
})
