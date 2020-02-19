import path from 'path'
import { describe, it, beforeEach } from 'mocha'
import { expect } from 'chai'
import { stub } from 'sinon'
import { corredor, apiClients, compose } from '@cortezaproject/corteza-js'
import CreateEmail from './CreateEmail'
const { Record, getModuleFromYaml } = compose
const { ComposeHelper } = corredor
const ComposeAPI = apiClients.Compose

describe(__filename, () => {
  let h,ui
  const modulesYaml = path.join(__dirname, '..', '..', '..', '..', 'config', '1100_modules.yaml')
  const recordID = '1'
  
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

  const emailTemplateModule = getModuleFromYaml('EmailTemplate', modulesYaml)
  const emailTemplateRecord = new Record(emailTemplateModule)
  emailTemplateRecord.values = {
    Subject: 'Subject',
    Body: 'Subject',
  }

  const contactModule = getModuleFromYaml('Contact', modulesYaml)
  const contactRecord = new Record(contactModule)

  const emailMessageModule = getModuleFromYaml('EmailMessage', modulesYaml)
  const emailMessageRecord = new Record(emailMessageModule)
  emailMessageRecord.values = {
    Subject: 'Test',
    HtmlBody: 'Test',
    Status: 'Draft',
    EmailTemplateId: settingsRecord.values.DefaultCaseEmailTemplate,
    CaseId: caseRecord.recordID,
    ContactId: caseRecord.values.ContactId
  }

  CreateEmail.procTemplate = () => {
    return 'Test'
  }

  beforeEach(() => {
    h = stub(new ComposeHelper({ ComposeAPI: new ComposeAPI({}) }))
    ui = stub({ 
      gotoRecordEditor: () => {}
    })
  })

  describe('successful case email creation', () => {
    it('should successfully create an email from case', async () => {
      h.findLastRecord.resolves(settingsRecord)
      h.findRecordByID.onCall(0).resolves(emailTemplateRecord)
      h.findRecordByID.onCall(1).resolves(contactRecord)
      h.makeRecord.resolves(emailMessageRecord)
      h.saveRecord.resolves(emailMessageRecord)

      await CreateEmail.exec({ $record: caseRecord }, { Compose: h, ComposeUI: ui })
      
      expect(h.findLastRecord.calledOnceWith('Settings')).true
      expect(h.findRecordByID.getCall(0).calledWith(settingsRecord.values.DefaultCaseEmailTemplate, 'EmailTemplate')).true
      expect(h.findRecordByID.getCall(1).calledWith(caseRecord.values.ContactId, 'Contact')).true
      expect(h.makeRecord.calledOnceWith(emailMessageRecord.values, 'EmailMessage')).true
      expect(h.saveRecord.calledOnceWith(emailMessageRecord)).true
    })
  })

  describe('error handling', () => {
    it('should throw error if findLastRecord throws', async () => {
      h.findLastRecord.throws()

      expect(async () => await CreateEmail.exec({ $record: caseRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if findRecordByID 1 throws', async () => {
      h.findLastRecord.resolves(settingsRecord)
      h.findRecordByID.onCall(0).throws()

      expect(async () => await CreateEmail.exec({ $record: caseRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if findRecordByID 2 throws', async () => {
      h.findLastRecord.resolves(settingsRecord)
      h.findRecordByID.onCall(0).resolves(emailTemplateRecord)
      h.findRecordByID.onCall(1).throws()

      expect(async () => await CreateEmail.exec({ $record: caseRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if makeRecord throws', async () => {
      h.findLastRecord.resolves(settingsRecord)
      h.findRecordByID.onCall(0).resolves(emailTemplateRecord)
      h.findRecordByID.onCall(1).resolves(contactRecord)
      h.makeRecord.throws()

      expect(async () => await CreateEmail.exec({ $record: caseRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if saveRecord throws', async () => {
      h.findLastRecord.resolves(settingsRecord)
      h.findRecordByID.onCall(0).resolves(emailTemplateRecord)
      h.findRecordByID.onCall(1).resolves(contactRecord)
      h.makeRecord.resolves(emailMessageRecord)
      h.saveRecord.throws()

      expect(async () => await CreateEmail.exec({ $record: caseRecord }, { Compose: h, ComposeUI: ui })).throws
    })
  })
})
