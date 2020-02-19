import path from 'path'
import { describe, it, beforeEach } from 'mocha'
import { expect } from 'chai'
import { stub } from 'sinon'
import { corredor, apiClients, compose } from '@cortezaproject/corteza-js'
import InsertNumber from './InsertNumber'
const { Record, getModuleFromYaml } = compose
const { ComposeHelper } = corredor
const ComposeAPI = apiClients.Compose

describe(__filename, () => {
  let h
  const modulesYaml = path.join(__dirname, '..', '..', '..', 'config', '1100_modules.yaml')

  const settingsModule = getModuleFromYaml('Settings', modulesYaml)
  const settingsRecord = new Record(settingsModule)
  settingsRecord.values = {
    SolutionNextNumber: 0
  }

  const savedSettings = new Record(settingsModule)
  savedSettings.values = {
    KBNextNumber: 1
  }

  const solutionRecord = {
    values: {
      SolutionNumber: 0
    }
  }

  beforeEach(() => {
    h = stub(new ComposeHelper({ ComposeAPI: new ComposeAPI({}) }))
  })

  describe('successful setting Solution number', () => {
    it('should sucessfully set Solution number', async () => {
      h.findLastRecord.resolves(settingsRecord)
      h.saveRecord.resolves(settingsRecord)

      const record = await InsertNumber.exec({ $record: solutionRecord }, { Compose: h })

      expect(h.findLastRecord.calledOnceWith('Settings')).true
      expect(record.values.SolutionNumber).equal(0)
    })
  })

  describe('error handling', () => {
    it('should throw error if findLastRecord throws', async () => {
      h.findLastRecord.throws()

      expect(async () => await InsertNumber.exec({ $record: solutionRecord }, { Compose: h })).throws
    })

    it('should throw error if saveRecord throws', async () => {
      h.findLastRecord.resolves(settingsRecord)
      h.saveRecord.throws()

      expect(async () => await InsertNumber.exec({ $record: solutionRecord }, { Compose: h })).throws
    })
  })
})
