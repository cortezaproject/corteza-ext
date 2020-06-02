import path from 'path'
import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'
import { stub, restore } from 'sinon'
import { corredor, apiClients, compose } from '@cortezaproject/corteza-js'
import AddUpdate from './AddUpdate'
const { Record, getModuleFromYaml } = compose
const { ComposeHelper } = corredor
const ComposeAPI = apiClients.Compose

describe(__filename, () => {
  let h,ui
  const modulesYaml = path.join(__dirname, '../../../../', 'config', '1100_modules.yaml')
  const recordID = '1'
  
  const settingsModule = getModuleFromYaml('Settings', modulesYaml)
  const settingsRecord = new Record(settingsModule)
  settingsRecord.recordID = recordID
  settingsRecord.values = {
    DefaultDepartment: 1,
    DefaultTimeUpdate: 1,
    DefaultCostPerHour: 1,
  }

  const caseModule = getModuleFromYaml('Case', modulesYaml)
  const caseRecord = new Record(caseModule)
  caseRecord.recordID = recordID
  caseRecord.values = {
    AccountId: '1',
    ContactId: '1',
  }

  const updateModule = getModuleFromYaml('Update', modulesYaml)
  const newUpdateRecord = new Record(updateModule)
  newUpdateRecord.values = {
    CaseId: caseRecord.recordID,
    AccountId: caseRecord.values.AccountId,
    ContactId: caseRecord.values.ContactId,
    Department: settingsRecord.values.DefaultDepartment,
    Cost: settingsRecord.values.DefaultCostPerHour * settingsRecord.values.DefaultTimeUpdate,
    TimeSpend: settingsRecord.values.DefaultTimeUpdate
  }

  beforeEach(() => {
    h = stub(new ComposeHelper({ ComposeAPI: new ComposeAPI({}) }))
    ui = stub({ 
      gotoRecordEditor: () => {}
    })
  })

  afterEach(() => {
    restore()
  })

  describe('successful case update', () => {
    it('should successfully update case', async () => {
      h.findLastRecord.resolves(settingsRecord)
      h.makeRecord.resolves(newUpdateRecord)
      h.saveRecord.resolves(newUpdateRecord)

      await AddUpdate.exec({ $record: caseRecord }, { Compose: h, ComposeUI: ui })
      
      expect(h.findLastRecord.calledOnceWith('Settings')).true
      expect(h.makeRecord.calledOnceWith(newUpdateRecord.values, 'Update')).true
      expect(h.saveRecord.calledOnceWith(newUpdateRecord)).true
      expect(ui.gotoRecordEditor.calledOnceWith(newUpdateRecord)).true
    })
  })

  describe('error handling', () => {
    it('should throw error if findLastRecord throws', async () => {
      h.findLastRecord.throws()

      expect(async () => await AddUpdate.exec({ $record: caseRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if makeRecord throws', async () => {
      h.findLastRecord.resolves(settingsRecord)
      h.makeRecord.throws()

      expect(async () => await AddUpdate.exec({ $record: caseRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if saveRecord throws', async () => {
      h.findLastRecord.resolves(settingsRecord)
      h.makeRecord.resolves(newUpdateRecord)
      h.saveRecord.throws()

      expect(async () => await AddUpdate.exec({ $record: caseRecord }, { Compose: h, ComposeUI: ui })).throws
    })
  })
})
