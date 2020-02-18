import path from 'path'
import { describe, it, beforeEach } from 'mocha'
import { expect } from 'chai'
import { stub } from 'sinon'
import { corredor, apiClients, compose } from '@cortezaproject/corteza-js'
import SetValues from './SetValues'
const { Record, getModuleFromYaml } = compose
const { ComposeHelper } = corredor
const ComposeAPI = apiClients.Compose

describe(__filename, () => {
  let h
  const modulesYaml = path.join(__dirname, '..', '..', '..', 'config', '1100_modules.yaml')
  const recordID = '1'

  const accountModule = getModuleFromYaml('Account', modulesYaml)
  const accountRecord = new Record(accountModule)
  accountRecord.recordID = recordID
  accountRecord.values = {
    AccountName: 'John'
  }

  beforeEach(() => {
    h = stub(new ComposeHelper({ ComposeAPI: new ComposeAPI({}) }))
  })

  describe('successful setting of account values', () => {
    it('should sucessfully set values of an account', async () => {
      const record = await SetValues.exec({ $record: accountRecord }, { Compose: h })
      expect(record.values.AccountSelect).equal('John')
    })
  })
})
