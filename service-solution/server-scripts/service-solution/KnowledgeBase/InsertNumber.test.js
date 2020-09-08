import path from 'path'
import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'
import { stub, restore } from 'sinon'
import { corredor, apiClients, compose } from '@cortezaproject/corteza-js'
import InsertNumber from './InsertNumber'
const { Record, getModuleFromYaml } = compose
const { ComposeHelper } = corredor
const ComposeAPI = apiClients.Compose

describe(__filename, () => {
  let h
  const modulesYaml = path.join(__dirname, '../../../', 'config', '1100_modules.yaml')

  const settingsModule = getModuleFromYaml('Settings', modulesYaml)
  const settingsRecord = new Record(settingsModule)
  settingsRecord.values = {
    KBNextNumber: 0
  }

  const savedSettings = new Record(settingsModule)
  savedSettings.values = {
    KBNextNumber: 1
  }

  const knowledgeRecord = {
    values: {
      Number: 0
    }
  }

  beforeEach(() => {
    h = stub(new ComposeHelper({ ComposeAPI: new ComposeAPI({}) }))
  })

  afterEach(() => {
    restore()
  })

  describe('successful setting of  KB number', () => {
    it('should sucessfully set KB number and save next KB number', async () => {
      h.findLastRecord.resolves(settingsRecord)
      h.saveRecord.resolves(savedSettings)

      const record = await InsertNumber.exec({ $record: knowledgeRecord }, { Compose: h })

      expect(h.findLastRecord.calledOnceWith('Settings')).true
      expect(h.saveRecord.calledOnceWith(savedSettings)).true
      expect(record.values.Number).equal(0)
    })
  })

  describe('error handling', () => {
    it('should throw error if findLastRecord throws', async () => {
      h.findLastRecord.throws()

      expect(async () => await InsertNumber.exec({ $record: knowledgeRecord }, { Compose: h })).throws
    })

    it('should throw error if saveRecord throws', async () => {
      h.findLastRecord.resolves(settingsRecord)
      h.saveRecord.throws()

      expect(async () => await InsertNumber.exec({ $record: knowledgeRecord }, { Compose: h })).throws
    })
  })
})
