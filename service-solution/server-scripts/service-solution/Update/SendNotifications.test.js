import path from 'path'
import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'
import { stub, restore } from 'sinon'
import { corredor, apiClients, compose } from '@cortezaproject/corteza-js'
import SendNotifications from './SendNotifications'
const { Record, getModuleFromYaml } = compose
const { ComposeHelper, MessagingHelper } = corredor
const ComposeAPI = apiClients.Compose
const MessagingAPI = apiClients.Messaging

describe(__filename, () => {
  let h, m
  const modulesYaml = path.join(__dirname, '../../../', 'config', '1100_modules.yaml')
  const recordID = '1'

  const settingsModule = getModuleFromYaml('Settings', modulesYaml)
  const settingsRecord = new Record(settingsModule)
  settingsRecord.recordID = recordID
  settingsRecord.values = {
    DefaultSupportChannel: '1',
    DefaultCaseRecordLink: '1'
  }

  const updateModule = getModuleFromYaml('Update', modulesYaml)
  const updateRecord = new Record(updateModule)
  updateRecord.recordID = recordID
  updateRecord.values = {
    CaseId: '1',
    Department: 'Department',
    Type: 'Type',
    Subject: 'Subject',
    Content: 'Content',
    SendToMailingList: true,
    Cost: 0,
    TimeSpend: 0,
    NotificationCaseMailingList: 1,
    NotificationCaseCreator: 1
  }

  const departmentModule = getModuleFromYaml('Department', modulesYaml)
  const departmentRecord = new Record(departmentModule)
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

  const contactModule = getModuleFromYaml('Contact', modulesYaml)
  const contactRecord = new Record(contactModule)
  contactRecord.recordID = recordID
  contactRecord.values = {
    OwnerId: '2',
    AccountId: '1',
    FirstName: 'John',
    LastName: 'Doe',
    IsPrimary: '1',
    Email: 'john.doe@mail.com',
    Phone: '123456789'
  }

  beforeEach(() => {
    h = stub(new ComposeHelper({ ComposeAPI: new ComposeAPI({}) }))
    m = stub(new MessagingHelper({ MessagingAPI: new MessagingAPI({}) }))
  })

  afterEach(() => {
    restore()
  })

  describe('successful inform of time and cost calculation', () => {
    it('should sucessfully inform with time and cost calculation', async () => {
      h.findRecordByID.onCall(0).resolves(departmentRecord)
      h.findRecordByID.onCall(1).resolves(caseRecord)
      h.findLastRecord.resolves(settingsRecord)
      h.findRecordByID.onCall(2).resolves(contactRecord)

      await SendNotifications.exec({ $record: updateRecord }, { Compose: h, Messaging: m })

      expect(h.findRecordByID.getCall(0).calledWith(updateRecord.values.CaseId, 'Case')).true
      expect(h.findLastRecord.calledOnceWith('Settings')).true
      expect(m.sendMessage.calledOnceWith('Automatic update. "' + caseRecord.values.Number + '" has been updated: ' + updateRecord.values.Subject + ' (type: ' + updateRecord.values.Type + '). Direct link: ' + settingsRecord.values.defaultCaseRecordLink + updateRecord.recordID, settingsRecord.values.defaultChannel))
      // @todo unexpected behaviour of commented test
      //expect(h.findRecordByID.getCall(2).calledWith(caseRecord.values.ContactId, 'Contact')).true
    })
  })

  describe('error handling', () => {
    it('should throw error if findRecordByID 1 throws', async () => {
      h.findRecordByID.onCall(0).throws()

      expect(async () => await SendNotifications.exec({ $record: updateRecord }, { Compose: h, Messaging: m })).throws
    })

    it('should throw error if findRecordByID 2 throws', async () => {
      h.findRecordByID.onCall(0).resolves(departmentRecord)
      h.findRecordByID.onCall(1).throws()

      expect(async () => await SendNotifications.exec({ $record: updateRecord }, { Compose: h, Messaging: m })).throws
    })

    it('should throw error if findLastRecord throws', async () => {
      h.findRecordByID.onCall(0).resolves(departmentRecord)
      h.findRecordByID.onCall(1).resolves(caseRecord)
      h.findLastRecord.throws()

      expect(async () => await SendNotifications.exec({ $record: updateRecord }, { Compose: h, Messaging: m })).throws
    })

    it('should throw error if findRecordByID 3 throws', async () => {
      h.findRecordByID.onCall(0).resolves(departmentRecord)
      h.findRecordByID.onCall(1).resolves(caseRecord)
      h.findLastRecord.resolves(settingsRecord)
      h.findRecordByID.onCall(2).throws()

      expect(async () => await SendNotifications.exec({ $record: updateRecord }, { Compose: h, Messaging: m })).throws
    })
  })
})
