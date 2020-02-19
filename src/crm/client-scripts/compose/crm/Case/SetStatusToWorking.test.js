import path from 'path'
import { describe, it, beforeEach } from 'mocha'
import { expect } from 'chai'
import { stub } from 'sinon'
import { corredor, apiClients, compose } from '@cortezaproject/corteza-js'
import SetStatusToWorking from './SetStatusToWorking'
const { Record, getModuleFromYaml } = compose
const { ComposeHelper } = corredor
const ComposeAPI = apiClients.Compose

describe(__filename, () => {
  let h
  const modulesYaml = path.join(__dirname, '..', '..', '..', '..', 'config', '1100_modules.yaml')
  const recordID = '1'

  const caseModule = getModuleFromYaml('Case', modulesYaml)
  const caseRecord = new Record(caseModule)
  caseRecord.recordID = recordID

  const newCaseRecord = new Record(caseModule)
  newCaseRecord.recordID = recordID
  newCaseRecord.values = {
    Status: 'Working'
  }

  const caseUpdateModule = getModuleFromYaml('CaseUpdate', modulesYaml)
  const caseUpdateRecord = new Record(caseUpdateModule)
  caseUpdateRecord.values = {
    CaseId: caseRecord.recordID,
    Description: 'State set to "Working"',
    Type: 'State change'
  }

  beforeEach(() => {
    h = stub(new ComposeHelper({ ComposeAPI: new ComposeAPI({}) }))
  })

  describe('successful case status to "Working"', () => {
    it('should successfully set case status to "Working"', async () => {
      h.makeRecord.resolves(caseUpdateRecord)
      h.saveRecord.onCall(0).resolves(caseUpdateRecord)
      h.saveRecord.onCall(1).resolves(newCaseRecord)

      await SetStatusToWorking.exec({ $record: caseRecord }, { Compose: h })
      
      expect(h.makeRecord.calledOnceWith(caseUpdateRecord.values, 'CaseUpdate')).true
      expect(h.saveRecord.getCall(0).calledWith(caseUpdateRecord)).true
      expect(h.saveRecord.getCall(1).lastArg.values.Status).equal('Working')
    })
  })

  describe('error handling', () => {
    it('should throw error if makeRecord throws', async () => {
      h.makeRecord.throws()

      expect(async () => await SetStatusToWorking.exec({ $record: caseRecord }, { Compose: h })).throws
    })

    it('should throw error if saveRecord 1 throws', async () => {
      h.makeRecord.resolves(caseUpdateRecord)
      h.saveRecord.onCall(0).throws()

      expect(async () => await SetStatusToWorking.exec({ $record: caseRecord }, { Compose: h })).throws
    })

    it('should throw error if saveRecord 2 throws', async () => {
      h.makeRecord.resolves(caseUpdateRecord)
      h.saveRecord.onCall(0).resolves(caseUpdateRecord)
      h.saveRecord.onCall(1).resolves(newCaseRecord)

      expect(async () => await SetStatusToWorking.exec({ $record: caseRecord }, { Compose: h })).throws
    })
  })
})
