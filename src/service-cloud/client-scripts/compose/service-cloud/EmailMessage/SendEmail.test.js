import path from 'path'
import { describe, it, beforeEach } from 'mocha'
import { expect } from 'chai'
import { stub } from 'sinon'
import { corredor, apiClients, compose } from '@cortezaproject/corteza-js'
import SendEmail from './SendEmail'
const { Record, getModuleFromYaml } = compose
const { ComposeHelper } = corredor
const ComposeAPI = apiClients.Compose

describe(__filename, () => {
  let h, ui
  const modulesYaml = path.join(__dirname, '..', '..', '..', '..', 'config', '1100_modules.yaml')
  const recordID = '1'

  // Mock timestamp
  SendEmail.getTimestamp = () => {
    return '1'
  }

  const settingsModule = getModuleFromYaml('Settings', modulesYaml)
  const settingsRecord = new Record(settingsModule)
  settingsRecord.recordID = recordID
  settingsRecord.values = {
    DefaultDepartment: 'DepartmentID',
    DefaultTimeUpdate: 1,
    DefaultCostPerHour: 1,
  }


  const emailRecord = {
    recordID: recordID,
    values: {
      ContactId: 'ContactId',
      Subject: 'Subject',
      HtmlBody: 'HtmlBody',
      Status: 'Status',
      ToAddress: 'ToAddress',
      MessageDate: 'MessageDate',
      CaseId: 'CaseId',
    }
  }

  const contactModule = getModuleFromYaml('Contact', modulesYaml)
  const contactRecord = new Record(contactModule)
  contactRecord.recordID = recordID
  contactRecord.values = {
    Email: 'Email',
    RecordLabel: 'RecordLabel',
  }

  const savedEmailRecord = { ...emailRecord }
  savedEmailRecord.values.Status = 'Sent'
  savedEmailRecord.values.ToAddress = contactRecord.values.Email
  savedEmailRecord.values.MessageDate = SendEmail.getTimestamp()

  const departmentRecord = {}
  departmentRecord.recordID = recordID
  departmentRecord.values = {
    HourCost: 0
  }

  const caseModule = getModuleFromYaml('Case', modulesYaml)
  const caseRecord = new Record(caseModule)
  caseRecord.values = {
    Number: 'Number',
    Subject: 'Subject',
    Category: 'Category',
    Status: 'Status',
    Priority: 'Priority',
    Description: 'Description',
    ContactId: 'ContactId'
  }

  const updateModule = getModuleFromYaml('Update', modulesYaml)
  const updateRecord = new Record(updateModule)
  updateRecord.values = {
    CaseId: savedEmailRecord.values.CaseId,
    Type: 'Outgoing email',
    Subject: 'Email: ' + savedEmailRecord.values.Subject,
    ContactId: savedEmailRecord.values.ContactId,
    From: 'Service Cloud',
    To: contactRecord.values.Email,
    Content: savedEmailRecord.values.HtmlBody,
    Department: settingsRecord.values.DefaultDepartment,
    TimeSpend: settingsRecord.values.DefaultTimeUpdate,
    Cost: settingsRecord.values.DefaultCostPerHour * settingsRecord.values.DefaultTimeUpdate
  }

  beforeEach(() => {
    h = stub(new ComposeHelper({ ComposeAPI: new ComposeAPI({}) }))
    ui = stub({ 
      success: () => {},
      gotoRecordViewer: () => {}
    })  
  })

  describe('successful send email', () => {
    it('should sucessfully send email', async () => {
      h.findRecordByID.onCall(0).resolves(contactRecord)
      h.saveRecord.onCall(0).resolves(savedEmailRecord)
      h.findLastRecord.resolves(settingsRecord)
      h.findRecordByID.onCall(1).resolves(departmentRecord)
      h.makeRecord.resolves(updateRecord)
      h.saveRecord.onCall(1).resolves(updateRecord)

      await SendEmail.exec({ $record: emailRecord }, { Compose: h, ComposeUI: ui })

      expect(h.findRecordByID.getCall(0).calledWith(emailRecord.values.ContactId, 'Contact')).true
      expect(h.sendMail.calledOnceWith(contactRecord.values.Email, emailRecord.values.Subject, { html: emailRecord.values.HtmlBody }))
      expect(ui.success.calledOnceWith(`The email "${emailRecord.values.Subject}" has been sent to "${contactRecord.values.RecordLabel}: ${contactRecord.values.Email}".`))
      expect(h.saveRecord.getCall(0).calledWith(savedEmailRecord)).true
      expect(ui.gotoRecordViewer.calledOnceWith(savedEmailRecord)).true
      expect(h.findLastRecord.calledOnceWith('Settings')).true
      expect(h.findRecordByID.getCall(1).calledWith(settingsRecord.values.DefaultDepartment, 'Department'))
      expect(h.makeRecord.calledOnceWith(updateRecord.values, 'CaseUpdate')).true
      expect(h.saveRecord.getCall(1).calledWith(updateRecord)).true
    })
  })

  describe('error handling', () => {
    it('should throw error if findRecordByID 1 throws', async () => {
      h.findRecordByID.onCall(0).throws()

      expect(async () => await SendEmail.exec({ $record: emailRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if saveRecord 1 throws', async () => {
      h.findRecordByID.onCall(0).resolves(contactRecord)
      h.saveRecord.onCall(0).throws()

      expect(async () => await SendEmail.exec({ $record: emailRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if findLastRecord throws', async () => {
      h.findRecordByID.onCall(0).resolves(contactRecord)
      h.saveRecord.onCall(0).resolves(savedEmailRecord)
      h.findLastRecord.throws()

      expect(async () => await SendEmail.exec({ $record: emailRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if findRecordByID 2 throws', async () => {
      h.findRecordByID.onCall(0).resolves(contactRecord)
      h.saveRecord.onCall(0).resolves(savedEmailRecord)
      h.findLastRecord.resolves(settingsRecord)
      h.findRecordByID.onCall(1).throws()

      expect(async () => await SendEmail.exec({ $record: emailRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if makeRecord throws', async () => {
      h.findRecordByID.onCall(0).resolves(contactRecord)
      h.saveRecord.onCall(0).resolves(savedEmailRecord)
      h.findLastRecord.resolves(settingsRecord)
      h.findRecordByID.onCall(1).resolves(departmentRecord)
      h.makeRecord.throws()

      expect(async () => await SendEmail.exec({ $record: emailRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if saveRecord 2 throws', async () => {
      h.findRecordByID.onCall(0).resolves(contactRecord)
      h.saveRecord.onCall(0).resolves(savedEmailRecord)
      h.findLastRecord.resolves(settingsRecord)
      h.findRecordByID.onCall(1).resolves(departmentRecord)
      h.makeRecord.resolves(updateRecord)
      h.saveRecord.onCall(1).throws()

      expect(async () => await SendEmail.exec({ $record: emailRecord }, { Compose: h, ComposeUI: ui })).throws
    })
  })
})
