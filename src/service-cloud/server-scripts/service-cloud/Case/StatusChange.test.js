import path from 'path'
import { describe, it, beforeEach } from 'mocha'
import { expect } from 'chai'
import { stub } from 'sinon'
import { corredor, apiClients, compose } from '@cortezaproject/corteza-js'
import StatusChange from './StatusChange'
const { Record, getModuleFromYaml } = compose
const { ComposeHelper } = corredor
const ComposeAPI = apiClients.Compose

// @todo module 'Department' not in 1100_modules.yaml
describe(__filename, () => {
  let h
  const modulesYaml = path.join(__dirname, '..', '..', '..', 'config', '1100_modules.yaml')
  const recordID = '1'
  
  const settingsModule = getModuleFromYaml('Settings', modulesYaml)
  const settingsRecord = new Record(settingsModule)
  settingsRecord.recordID = recordID
  settingsRecord.values = {
    DefaultDepartment: 'DepartmentID',
    DefaultTimeUpdate: 1,
    DefaultCostPerHour: 1,
  }

  const caseModule = getModuleFromYaml('Case', modulesYaml)
  const caseRecord = new Record(caseModule)
  caseRecord.recordID = recordID
  caseRecord.values = {
    Status: 'New',
    PreviousStatus: 'None',
    AccountId: '1',
    ContactId: '1',
    TotalTime: 1,
    TotalCost: 1
  }

  const departmentModule = getModuleFromYaml('Department', modulesYaml)
  const departmentRecord = new Record(departmentModule)
  departmentRecord.values = {
    HourCost: 1
  }

  const updateModule = getModuleFromYaml('Update', modulesYaml)
  const updateRecord = new Record(updateModule)
  updateRecord.values = {
    CaseId: caseRecord.recordID,
    Type: 'Status change',
    Subject: 'Status changed from ' + caseRecord.values.PreviousStatus + ' to ' + caseRecord.values.Status,
    AccountId: caseRecord.values.AccountId,
    From: 'Automatic message',
    Department: settingsRecord.values.DefaultDepartment,
    TimeSpend: settingsRecord.values.DefaultTimeUpdate,
    Cost: settingsRecord.values.DefaultCostPerHour * settingsRecord.values.DefaultTimeUpdate
  }

  const newCaseRecord = new Record(caseModule)
  newCaseRecord.recordID = recordID
  newCaseRecord.values = {
    Status: 'New',
    PreviousStatus: 'New',
    AccountId: '1',
    ContactId: '1',
    TotalCost: caseRecord.values.TotalCost + settingsRecord.values.DefaultCostPerHour * settingsRecord.values.DefaultTimeUpdate,
    TotalTime: caseRecord.values.TotalTime + settingsRecord.values.DefaultTimeUpdate
  }

  beforeEach(() => {
    h = stub(new ComposeHelper({ ComposeAPI: new ComposeAPI({}) }))
  })

  describe('successful case status change', () => {
    it('should successfully change case status', async () => {
      h.findLastRecord.resolves(settingsRecord)
      h.findRecordByID.resolves(departmentRecord)
      h.makeRecord.resolves(updateRecord)
      h.saveRecord.resolves(updateRecord)

      const record = await StatusChange.exec({ $record: caseRecord }, { Compose: h })
      
      expect(h.findLastRecord.calledOnceWith('Settings')).true
      expect(h.findRecordByID.calledOnceWith(settingsRecord.values.DefaultDepartment, 'Department'))
      expect(h.makeRecord.calledOnceWith(updateRecord.values, 'Update')).true
      expect(h.saveRecord.calledOnceWith(updateRecord)).true
      expect(record.values).to.deep.equal(newCaseRecord.values)
    })
  })

  describe('error handling', () => {
    it('should throw error if findLastRecord throws', async () => {
      h.findLastRecord.throws()

      expect(async () => await StatusChange.exec({ $record: caseRecord }, { Compose: h })).throws
    })

    it('should throw error if findRecordByID throws', async () => {
      h.findLastRecord.resolves(settingsRecord)
      h.findRecordByID.throws()

      expect(async () => await StatusChange.exec({ $record: caseRecord }, { Compose: h })).throws
    })

    it('should throw error if makeRecord throws', async () => {
      h.findLastRecord.resolves(settingsRecord)
      h.findRecordByID.resolves(departmentRecord)
      h.makeRecord.throws()

      expect(async () => await StatusChange.exec({ $record: caseRecord }, { Compose: h })).throws
    })

    it('should throw error if saveRecord throws', async () => {
      h.findLastRecord.resolves(settingsRecord)
      h.findRecordByID.resolves(departmentRecord)
      h.makeRecord.resolves(updateRecord)
      h.saveRecord.throws()

      expect(async () => await StatusChange.exec({ $record: caseRecord }, { Compose: h })).throws
    })
  })
})
