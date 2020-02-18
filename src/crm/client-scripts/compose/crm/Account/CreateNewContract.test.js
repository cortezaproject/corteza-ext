import path from 'path'
import { describe, it, beforeEach } from 'mocha'
import { expect } from 'chai'
import { stub } from 'sinon'
import { corredor, apiClients, compose } from '@cortezaproject/corteza-js'
import CreateNewContract from './CreateNewContract'
const { ComposeHelper } = corredor
const { Record, getModuleFromYaml } = compose
const ComposeAPI = apiClients.Compose

describe(__filename, () => {
  let h,ui

  const modulesYaml = path.join(__dirname, '..', '..', '..', '..', 'config', '1100_modules.yaml')
  const recordID = '1'

  const settingsModule = getModuleFromYaml('Settings', modulesYaml)
  const settingsRecord = new Record(settingsModule)
  settingsRecord.recordID = recordID
  settingsRecord.values = {
    ContractDefaultTime: 123,
    ContractNextNumber: 1
  }

  const accountModule = getModuleFromYaml('Account', modulesYaml)
  const accountRecord = new Record(accountModule)
  accountRecord.recordID = recordID
  accountRecord.values = {
    OwnerId: '2',
    BillingStreet: 'Street 1',
    BillingCity: 'City 1',
    BillingState: 'State 1',
    BillingPostalCode: 'PostalCode 1',
    BillingCountry: 'Country 1',
  }

  const contractModule = getModuleFromYaml('Contract', modulesYaml)
  const newContractRecord = new Record(contractModule)
  newContractRecord.values = {
    OwnerId: '2',
    AccountId: recordID,
    Status: 'Draft',
    BillingStreet: accountRecord.values.BillingStreet,
    BillingCity: accountRecord.values.BillingCity,
    BillingState: accountRecord.values.BillingState,
    BillingPostalCode: accountRecord.values.BillingPostalCode,
    BillingCountry: accountRecord.values.BillingCountry,
    ShippingStreet: accountRecord.values.BillingStreet,
    ShippingCity: accountRecord.values.BillingCity,
    ShippingState: accountRecord.values.BillingState,
    ShippingPostalCode: accountRecord.values.BillingPostalCode,
    ShippingCountry: accountRecord.values.BillingCountry,
    ContractTerm: settingsRecord.values.ContractDefaultTime,
    ContractNumber: settingsRecord.values.ContractNextNumber,
  }

  beforeEach(() => {
    h = stub(new ComposeHelper({ ComposeAPI: new ComposeAPI({}) }))
    ui = stub({ 
      success: () => {},
      gotoRecordEditor: () => {}
    })
  })

  describe('successful creation', () => {
    it('should successfully create contract from an account', async () => {
      h.findLastRecord.resolves(settingsRecord)
      h.makeRecord.resolves(newContractRecord)
      h.saveRecord.onFirstCall().resolves(newContractRecord)
      h.saveRecord.onSecondCall().resolves(settingsRecord)
  
      await CreateNewContract.exec({ $record: accountRecord }, { Compose: h, ComposeUI: ui })
      
      expect(h.findLastRecord.calledOnceWith('Settings')).true
      expect(h.makeRecord.calledOnceWith(newContractRecord.values, 'Contract')).true
      expect(h.saveRecord.getCall(0).calledWith(newContractRecord)).true
      expect(h.saveRecord.getCall(1).calledWith(settingsRecord)).true
      expect(ui.success.calledOnceWith('The new contract record has been created.')).true
      expect(ui.gotoRecordEditor.calledOnceWith(newContractRecord)).true
    })
  })

  describe('error handling', () => {
    it('should throw error if findLastRecord throws', async () => {
      h.findLastRecord.throws()

      expect(async () => await CreateNewContract.exec({ $record: accountRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if makeRecord throws', async () => {
      h.findLastRecord.resolves(settingsRecord)
      h.makeRecord.throws()

      expect(async () => await CreateNewContract.exec({ $record: accountRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if saveRecord 1 throws', async () => {
      h.findLastRecord.resolves(settingsRecord)
      h.makeRecord.resolves(newContractRecord)
      h.saveRecord.onFirstCall().throws()

      expect(async () => await CreateNewContract.exec({ $record: accountRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if saveRecord 2 throws', async () => {
      h.findLastRecord.resolves(settingsRecord)
      h.makeRecord.resolves(newContractRecord)
      h.saveRecord.onFirstCall().resolves(newContractRecord)
      h.saveRecord.onSecondCall().throws()

      expect(async () => await CreateNewContract.exec({ $record: accountRecord }, { Compose: h, ComposeUI: ui })).throws
    })
  })
})
