import path from 'path'
import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'
import { stub, restore } from 'sinon'
import { corredor, apiClients, compose } from '@cortezaproject/corteza-js'
import SetLabel from './SetLabel'
const { Record, getModuleFromYaml } = compose
const { ComposeHelper } = corredor
const ComposeAPI = apiClients.Compose

describe(__filename, () => {
  let h
  const modulesYaml = path.join(__dirname, '../../../', 'config', '1100_modules.yaml')
  const recordID = '1'

  const contactModule = getModuleFromYaml('Contact', modulesYaml)
  const contactRecord = new Record(contactModule)
  contactRecord.recordID = recordID
  contactRecord.values = {
    AccountId: '1',
    FirstName: 'John',
    LastName: 'Doe'
  }

  const accountModule = getModuleFromYaml('Account', modulesYaml)
  const accountRecord = new Record(accountModule)
  accountRecord.recordID = recordID
  accountRecord.values = {
    AccountId: '1',
    AccountName: 'AccountName'
  }

  beforeEach(() => {
    h = stub(new ComposeHelper({ ComposeAPI: new ComposeAPI({}) }))
  })

  afterEach(() => {
    restore()
  })

  describe('successful setting of contact values', () => {
    it('should sucessfully set record label of a contact when Account record doesnt exist', async () => {
      h.findRecordByID.resolves(undefined)

      const record = await SetLabel.exec({ $record: contactRecord }, { Compose: h })
      expect(h.findRecordByID.calledOnceWith(contactRecord.AccountId, 'Account'))
      expect(record.values.RecordLabel).equal('John Doe')
    })

    it('should sucessfully set record labe of a contact', async () => {
      h.findRecordByID.resolves(accountRecord)

      const record = await SetLabel.exec({ $record: contactRecord }, { Compose: h })
      expect(h.findRecordByID.calledOnceWith(contactRecord.AccountId, 'Account'))
      expect(record.values.RecordLabel).equal('John Doe (AccountName)')
    })
  })

  describe('error handling', async () => {
    it('should throw error if findRecordByID throws', async () => {
      h.findRecordByID.throws()

      expect(async () => await SetLabel.exec({ caseRecord: contactRecord }, { Compose: h })).throws
    })
  })
})
