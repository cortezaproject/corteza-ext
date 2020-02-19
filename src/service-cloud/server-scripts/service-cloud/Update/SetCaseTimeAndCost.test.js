import path from 'path'
import { describe, it, beforeEach } from 'mocha'
import { expect } from 'chai'
import { stub } from 'sinon'
import { corredor, apiClients, compose } from '@cortezaproject/corteza-js'
import SetCaseTimeAndCost from './SetCaseTimeAndCost'
const { Record, getModuleFromYaml } = compose
const { ComposeHelper } = corredor
const ComposeAPI = apiClients.Compose

describe(__filename, () => {
  let h
  const modulesYaml = path.join(__dirname, '..', '..', '..', 'config', '1100_modules.yaml')
  const recordID = '1'

  // Mock timestamp
  SetCaseTimeAndCost.getTimestamp = () => {
    return '1'
  }

  const updateModule = getModuleFromYaml('Update', modulesYaml)
  const updateRecord = new Record(updateModule)
  updateRecord.recordID = recordID
  updateRecord.values = {
    CaseId: '1',
    Department: 'Department',
  }

  const caseModule = getModuleFromYaml('Case', modulesYaml)
  const caseRecord = new Record(caseModule)
  caseRecord.recordID = recordID
  caseRecord.values = {
    AccountId: '1',
    ProductId: '1',
    TotalTime: 0,
    TotalCost: 0,
  }

  const newCaseRecord = new Record(caseModule)
  newCaseRecord.recordID = recordID
  newCaseRecord.values = {
    ...caseRecord.values,
    TotalTime: 0,
    TotalCost: 0,
  }

  const accountModule = getModuleFromYaml('Account', modulesYaml)
  const accountRecord = new Record(accountModule)
  accountRecord.recordID = recordID
  accountRecord.values = {
    TotalTime: 0,
    TotalCost: 0,
  }

  const productModule = getModuleFromYaml('Product', modulesYaml)
  const productRecord = new Record(productModule)
  productRecord.recordID = recordID
  productRecord.values = {
    TotalTime: 0,
    TotalCost: 0,
  }

  const departmentModule = getModuleFromYaml('Department', modulesYaml)
  const departmentRecord = new Record(departmentModule)
  departmentRecord.recordID = recordID
  departmentRecord.values = {
    TotalTime: 0,
    TotalCost: 0,
  }


  beforeEach(() => {
    h = stub(new ComposeHelper({ ComposeAPI: new ComposeAPI({}) }))
  })

  describe('successful sum of time and cost', () => {
    it('should successfully set time and cost', async () => {
      h.findRecordByID.onCall(0).resolves(caseRecord)
      h.findRecords.onCall(0).resolves({ set: [updateRecord] })
      h.saveRecord.onCall(0).resolves(caseRecord)
      h.findRecordByID.onCall(1).resolves(accountRecord)
      h.findRecords.onCall(1).resolves({ set: [caseRecord] })
      h.saveRecord.onCall(1).resolves(accountRecord)
      h.findRecordByID.onCall(2).resolves(productRecord)
      h.findRecords.onCall(2).resolves({ set: [caseRecord] })
      h.saveRecord.onCall(2).resolves(productRecord)
      h.findRecordByID.onCall(3).resolves(departmentRecord)
      h.findRecords.onCall(3).resolves({ set: [caseRecord] })
      h.saveRecord.onCall(3).resolves(departmentRecord)

      await SetCaseTimeAndCost.exec({ $record: updateRecord }, { Compose: h })
      
      expect(h.findRecordByID.getCall(0).calledWith(updateRecord.values.CaseId, 'Case')).true
      expect(h.findRecords.getCall(0).calledWith(`CaseId = ${updateRecord.values.CaseId}`, 'Update')).true
      expect(h.saveRecord.getCall(0).calledWith(caseRecord)).true
      expect(h.findRecordByID.getCall(1).calledWith(caseRecord.values.AccountId, 'Account')).true
      expect(h.findRecords.getCall(1).calledWith(`AccountId = ${accountRecord.recordID}`, 'Case')).true
      expect(h.saveRecord.getCall(1).calledWith(accountRecord)).true
      expect(h.findRecordByID.getCall(2).calledWith(caseRecord.values.ProductId, 'Product')).true
      expect(h.findRecords.getCall(2).calledWith(`ProductId = ${productRecord.recordID}`, 'Case')).true
      expect(h.saveRecord.getCall(2).calledWith(accountRecord)).true
      expect(h.findRecordByID.getCall(3).calledWith(updateRecord.values.Department, 'Department')).true
      expect(h.findRecords.getCall(3).calledWith(`Department = ${updateRecord.values.Department}`, 'Update')).true
      expect(h.saveRecord.getCall(3).calledWith(departmentRecord)).true
    })
  })

  describe('error handling', () => {
    it('should throw error if findRecordByID 1 throws', async () => {
      h.findRecordByID.onCall(0).throws()

      expect(async () => await SetCaseTimeAndCost.exec({ $record: updateRecord }, { Compose: h })).throws
    })

    it('should throw error if findRecords 1 throws', async () => {
      h.findRecordByID.onCall(0).resolves(caseRecord)
      h.findRecords.onCall(0).throws()

      expect(async () => await SetCaseTimeAndCost.exec({ $record: updateRecord }, { Compose: h })).throws
    })

    it('should throw error if saveRecord 1 throws', async () => {
      h.findRecordByID.onCall(0).resolves(caseRecord)
      h.findRecords.onCall(0).resolves({ set: [updateRecord] })
      h.saveRecord.onCall(0).throws()

      expect(async () => await SetCaseTimeAndCost.exec({ $record: updateRecord }, { Compose: h })).throws
    })

    it('should throw error if findRecordByID 2 throws', async () => {
      h.findRecordByID.onCall(0).resolves(caseRecord)
      h.findRecords.onCall(0).resolves({ set: [updateRecord] })
      h.saveRecord.onCall(0).resolves(caseRecord)
      h.findRecordByID.onCall(1).throws()

      expect(async () => await SetCaseTimeAndCost.exec({ $record: updateRecord }, { Compose: h })).throws
    })

    it('should throw error if findRecords 2 throws', async () => {
      h.findRecordByID.onCall(0).resolves(caseRecord)
      h.findRecords.onCall(0).resolves({ set: [updateRecord] })
      h.saveRecord.onCall(0).resolves(caseRecord)
      h.findRecordByID.onCall(1).resolves(accountRecord)
      h.findRecords.onCall(1).throws()

      expect(async () => await SetCaseTimeAndCost.exec({ $record: updateRecord }, { Compose: h })).throws
    })

    it('should throw error if saveRecord 2 throws', async () => {
      h.findRecordByID.onCall(0).resolves(caseRecord)
      h.findRecords.onCall(0).resolves({ set: [updateRecord] })
      h.saveRecord.onCall(0).resolves(caseRecord)
      h.findRecordByID.onCall(1).resolves(accountRecord)
      h.findRecords.onCall(1).resolves({ set: [caseRecord] })
      h.saveRecord.onCall(1).throws()

      expect(async () => await SetCaseTimeAndCost.exec({ $record: updateRecord }, { Compose: h })).throws
    })

    it('should throw error if findRecordByID 3 throws', async () => {
      h.findRecordByID.onCall(0).resolves(caseRecord)
      h.findRecords.onCall(0).resolves({ set: [updateRecord] })
      h.saveRecord.onCall(0).resolves(caseRecord)
      h.findRecordByID.onCall(1).resolves(accountRecord)
      h.findRecords.onCall(1).resolves({ set: [caseRecord] })
      h.saveRecord.onCall(1).resolves(accountRecord)
      h.findRecordByID.onCall(2).throws()

      expect(async () => await SetCaseTimeAndCost.exec({ $record: updateRecord }, { Compose: h })).throws
    })

    it('should throw error if findRecords 3 throws', async () => {
      h.findRecordByID.onCall(0).resolves(caseRecord)
      h.findRecords.onCall(0).resolves({ set: [updateRecord] })
      h.saveRecord.onCall(0).resolves(caseRecord)
      h.findRecordByID.onCall(1).resolves(accountRecord)
      h.findRecords.onCall(1).resolves({ set: [caseRecord] })
      h.saveRecord.onCall(1).resolves(accountRecord)
      h.findRecordByID.onCall(2).resolves(productRecord)
      h.findRecords.onCall(2).throws()

      expect(async () => await SetCaseTimeAndCost.exec({ $record: updateRecord }, { Compose: h })).throws
    })

    it('should throw error if saveRecord 3 throws', async () => {
      h.findRecordByID.onCall(0).resolves(caseRecord)
      h.findRecords.onCall(0).resolves({ set: [updateRecord] })
      h.saveRecord.onCall(0).resolves(caseRecord)
      h.findRecordByID.onCall(1).resolves(accountRecord)
      h.findRecords.onCall(1).resolves({ set: [caseRecord] })
      h.saveRecord.onCall(1).resolves(accountRecord)
      h.findRecordByID.onCall(2).resolves(productRecord)
      h.findRecords.onCall(2).resolves({ set: [caseRecord] })
      h.saveRecord.onCall(2).throws()

      expect(async () => await SetCaseTimeAndCost.exec({ $record: updateRecord }, { Compose: h })).throws
    })

    it('should throw error if findRecordByID 4 throws', async () => {
      h.findRecordByID.onCall(0).resolves(caseRecord)
      h.findRecords.onCall(0).resolves({ set: [updateRecord] })
      h.saveRecord.onCall(0).resolves(caseRecord)
      h.findRecordByID.onCall(1).resolves(accountRecord)
      h.findRecords.onCall(1).resolves({ set: [caseRecord] })
      h.saveRecord.onCall(1).resolves(accountRecord)
      h.findRecordByID.onCall(2).resolves(productRecord)
      h.findRecords.onCall(2).resolves({ set: [caseRecord] })
      h.saveRecord.onCall(2).resolves(productRecord)
      h.findRecordByID.onCall(3).throws()

      expect(async () => await SetCaseTimeAndCost.exec({ $record: updateRecord }, { Compose: h })).throws
    })

    it('should throw error if findRecords 4 throws', async () => {
      h.findRecordByID.onCall(0).resolves(caseRecord)
      h.findRecords.onCall(0).resolves({ set: [updateRecord] })
      h.saveRecord.onCall(0).resolves(caseRecord)
      h.findRecordByID.onCall(1).resolves(accountRecord)
      h.findRecords.onCall(1).resolves({ set: [caseRecord] })
      h.saveRecord.onCall(1).resolves(accountRecord)
      h.findRecordByID.onCall(2).resolves(productRecord)
      h.findRecords.onCall(2).resolves({ set: [caseRecord] })
      h.saveRecord.onCall(2).resolves(productRecord)
      h.findRecordByID.onCall(3).resolves(departmentRecord)
      h.findRecords.onCall(3).throws()

      expect(async () => await SetCaseTimeAndCost.exec({ $record: updateRecord }, { Compose: h })).throws
    })

    it('should throw error if saveRecord 4 throws', async () => {
      h.findRecordByID.onCall(0).resolves(caseRecord)
      h.findRecords.onCall(0).resolves({ set: [updateRecord] })
      h.saveRecord.onCall(0).resolves(caseRecord)
      h.findRecordByID.onCall(1).resolves(accountRecord)
      h.findRecords.onCall(1).resolves({ set: [caseRecord] })
      h.saveRecord.onCall(1).resolves(accountRecord)
      h.findRecordByID.onCall(2).resolves(productRecord)
      h.findRecords.onCall(2).resolves({ set: [caseRecord] })
      h.saveRecord.onCall(2).resolves(productRecord)
      h.findRecordByID.onCall(3).resolves(departmentRecord)
      h.findRecords.onCall(3).resolves({ set: [caseRecord] })
      h.saveRecord.onCall(3).throws()

      expect(async () => await SetCaseTimeAndCost.exec({ $record: updateRecord }, { Compose: h })).throws
    })
  })
})
