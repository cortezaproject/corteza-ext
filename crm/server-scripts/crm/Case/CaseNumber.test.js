import path from 'path'
import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'
import { stub, restore } from 'sinon'
import { corredor, apiClients, compose } from '@cortezaproject/corteza-js'
import CaseNumber from './CaseNumber'
const { Record, getModuleFromYaml } = compose
const { ComposeHelper } = corredor
const ComposeAPI = apiClients.Compose

describe(__filename, () => {
  let h
  const modulesYaml = path.join(__dirname, '../../../', 'config', '1100_modules.yaml')
  const recordID = '1'
  
  const settingsModule = getModuleFromYaml('Settings', modulesYaml)
  const settingsRecord = new Record(settingsModule)
  settingsRecord.recordID = recordID
  settingsRecord.values = {
    CaseNextNumber: 1
  }

  const newSettingsRecord = new Record(settingsModule)
  newSettingsRecord.recordID = recordID
  newSettingsRecord.values = {
    CaseNextNumber: 2
  }

  const caseModule = getModuleFromYaml('Case', modulesYaml)
  const caseRecord = new Record(caseModule)
  caseRecord.recordID = recordID

  const newCaseRecord = new Record(caseModule)
  newCaseRecord.values = {
    CaseNumber: settingsRecord.values.CaseNextNumber
  }

  beforeEach(() => {
    h = stub(new ComposeHelper({ ComposeAPI: new ComposeAPI({}) }))
  })

  afterEach(() => {
    restore()
  })

  describe('successful setting of case number', () => {
    it('should successfully set case number', async () => {
      h.findLastRecord.resolves(settingsRecord)
      h.saveRecord.resolves(newSettingsRecord)

      await CaseNumber.exec({ $record: caseRecord }, { Compose: h })
      
      expect(h.findLastRecord.calledOnceWith('Settings')).true
      expect(h.saveRecord.calledOnceWith(newSettingsRecord)).true
    })
  })

  describe('error handling', () => {
    it('should throw error if findLastRecord throws', async () => {
      h.findLastRecord.throws()

      expect(async () => await CaseNumber.exec({ $record: caseRecord }, { Compose: h })).throws
    })

    it('should throw error if saveRecord throws', async () => {
      h.findLastRecord.resolves(settingsRecord)
      h.saveRecord.throws()

      expect(async () => await CaseNumber.exec({ $record: caseRecord }, { Compose: h })).throws
    })
  })
})
