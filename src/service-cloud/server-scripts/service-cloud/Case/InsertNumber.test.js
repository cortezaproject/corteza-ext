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

  InsertNumber.getCaseNumber = () => {
    return 'Ticket#1'
  }

  const caseModule = getModuleFromYaml('Case', modulesYaml)
  const caseRecord = new Record(caseModule)

  beforeEach(() => {
    h = stub(new ComposeHelper({ ComposeAPI: new ComposeAPI({}) }))
  })

  describe('successful setting of case number', () => {
    it('should sucessfully set case number', async () => {
      const record = await InsertNumber.exec({ $record: caseRecord }, { Compose: h })
      expect(record.values.Number).equal('Ticket#1')
      expect(record.values.Status).equal('New')
      expect(record.values.PreviousStatus).equal('New')
    })
  })
})
