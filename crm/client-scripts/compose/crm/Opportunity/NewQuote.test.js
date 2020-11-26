import path from 'path'
import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'
import { stub, restore } from 'sinon'
import { corredor, apiClients, compose } from '@cortezaproject/corteza-js'
import NewQuote from './NewQuote'
const { Record, getModuleFromYaml } = compose
const { ComposeHelper } = corredor
const ComposeAPI = apiClients.Compose

describe(__filename, () => {
  let h, ui
  const modulesYaml = path.join(__dirname, '../../../../', 'config', '1100_modules.yaml')
  const recordID = '1'

  // Mock timestamp
  NewQuote.getTimestamp = () => {
    return '1'
  }

  const settingsModule = getModuleFromYaml('Settings', modulesYaml)
  const settingsRecord = new Record(settingsModule)
  settingsRecord.recordID = recordID
  settingsRecord.values = {
    QuoteExpirationDays: 0,
    QuoteNextNumber: 0,
  }

  const newSettingsRecord = new Record(settingsModule)
  newSettingsRecord.recordID = recordID
  newSettingsRecord.values = {
    QuoteExpirationDays: 0,
    QuoteNextNumber: 1,
  }

  const opportunityModule = getModuleFromYaml('Opportunity', modulesYaml)
  const opportunityRecord = new Record(opportunityModule)
  opportunityRecord.recordID = recordID
  opportunityRecord.values = {
    Name: 'Name',
    AccountId: '1',
    Amount: '1',
    PricebookId: '1'
  }

  const opportunityContactRoleModule = getModuleFromYaml('OpportunityContactRole', modulesYaml)
  const opportunityContactRoleRecord = new Record(opportunityContactRoleModule)
  opportunityContactRoleRecord.values = {
    ContactId: opportunityRecord.recordID,
    IsPrimary: '1'
  }

  const contactModule = getModuleFromYaml('Contact', modulesYaml)
  const contactRecord = new Record(contactModule)
  contactRecord.recordID = recordID
  contactRecord.values = {
    Email: 'john.doe@mail.com',
    Phone: '123456789',
    Fax: 'Fax'
  }

  const accountModule = getModuleFromYaml('Account', modulesYaml)
  const accountRecord = new Record(accountModule)
  accountRecord.recordID = recordID
  accountRecord.values = {
    AccountName: 'AccountName,',
    BillingStreet: 'BillingStreet,',
    BillingCity: 'BillingCity,',
    BillingState: 'BillingState,',
    BillingPostalCode: 'BillingPostalCode,',
    BillingCountry: 'BillingCountry,',
  }

  const quoteModule = getModuleFromYaml('Quote', modulesYaml)
  const quoteRecord = new Record(quoteModule)
  quoteRecord.recordID = recordID
  quoteRecord.createdBy = recordID
  quoteRecord.values = {
    ShippingHandling: 0,
    Status: 'Draft',
    Discount: 0,
    Tax: 0,
    OpportunityId: opportunityRecord.recordID,
    GrandTotal: opportunityRecord.values.Amount,
    PricebookId: opportunityRecord.values.PricebookId,
    Name: opportunityRecord.values.Name,
    Subtotal: opportunityRecord.values.Amount,
    TotalPrice: opportunityRecord.values.Amount,
    ContactId: contactRecord.recordID,
    Email: contactRecord.values.Email,
    Phone: contactRecord.values.Phone,
    Fax: contactRecord.values.Fax,
    AccountId: accountRecord.recordID, 
    BillingStreet: accountRecord.values.BillingStreet,
    BillingCity: accountRecord.values.BillingCity,
    BillingState: accountRecord.values.BillingState,
    BillingPostalCode: accountRecord.values.BillingPostalCode,
    BillingCountry: accountRecord.values.BillingCountry,
    BillingName: accountRecord.values.AccountName,
    QuoteToStreet: accountRecord.values.BillingStreet,
    QuoteToCity: accountRecord.values.BillingCity,
    QuoteToState: accountRecord.values.BillingState,
    QuoteToPostalCode: accountRecord.values.BillingPostalCode,
    QuoteToCountry: accountRecord.values.BillingCountry,
    QuoteToName: accountRecord.values.AccountName,
    ShippingStreet: accountRecord.values.BillingStreet,
    ShippingCity: accountRecord.values.BillingCity,
    ShippingState: accountRecord.values.BillingState,
    ShippingPostalCode: accountRecord.values.BillingPostalCode,
    ShippingCountry: accountRecord.values.BillingCountry,
    ShippingName: accountRecord.values.AccountName,
    ExpirationDate: NewQuote.getTimestamp(),
    QuoteNumber: settingsRecord.values.QuoteNextNumber
  }

  const opportunityLineModule = getModuleFromYaml('OpportunityLineItem', modulesYaml)
  const opportunityLineRecord = new Record(opportunityLineModule)
  opportunityLineRecord.recordID = recordID
  opportunityLineRecord.values = {
    Discount: 'Discount',
    Description: 'Description',
    ListPrice: 'ListPrice',
    PricebookEntryId: 'PricebookEntryId',
    ProductId: 'ProductId',
    ProductCode: 'ProductCode',
    Quantity: 'Quantity',
    UnitPrice: 'UnitPrice',
    Subtotal: 'Subtotal',
    TotalPrice: 'TotalPrice',
    QuoteId: quoteRecord.recordID
  }

  const quoteLineModule = getModuleFromYaml('QuoteLineItem', modulesYaml)
  const quoteLineRecord = new Record(quoteLineModule)
  quoteLineRecord.recordID = recordID
  quoteLineRecord.values = {
    AccountName: 'AccountName,',
    BillingStreet: 'BillingStreet,',
    BillingCity: 'BillingCity,',
    BillingState: 'BillingState,',
    BillingPostalCode: 'BillingPostalCode,',
    BillingCountry: 'BillingCountry,',
  }

  beforeEach(() => {
    h = stub(new ComposeHelper({ ComposeAPI: new ComposeAPI({}) }))
    ui = stub({ 
      success: () => {},
      warning: () => {},
      gotoRecordEditor: () => {}
    })
  })

  afterEach(() => {
    restore()
  })

  describe('successful create', () => {
    it('should successfully create new quote', async () => {
      h.findRecordByID.onCall(0).resolves(accountRecord)
      h.findRecords.onCall(0).resolves({ set: [opportunityContactRoleRecord] })
      h.findLastRecord.resolves(settingsRecord)
      h.saveRecord.onCall(0).resolves(newSettingsRecord)
      h.makeRecord.onCall(0).resolves(quoteRecord)
      h.saveRecord.onCall(1).resolves(quoteRecord)
      h.findRecords.onCall(1).resolves({ set: [opportunityLineRecord] })
      h.makeRecord.onCall(1).resolves(quoteLineRecord)
      h.saveRecord.onCall(2).resolves(quoteLineRecord)

      await NewQuote.exec({ $record: opportunityRecord }, { Compose: h, ComposeUI: ui })

      expect(h.findRecordByID.getCall(0).calledWith(opportunityRecord.values.AccountId, 'Account')).true
      expect(h.findRecords.getCall(0).calledWith(`AccountId = ${accountRecord.recordID}`, 'Contact')).true
      expect(h.findLastRecord.calledOnceWith('Settings'))
      expect(h.saveRecord.getCall(0).calledWith(newSettingsRecord))
      expect(h.makeRecord.getCall(0).calledWith(quoteRecord.values, 'Quote'))
      expect(h.saveRecord.getCall(1).calledWith(quoteRecord))
      expect(h.findRecords.getCall(1).calledWith({ filter: `OpportunityId = ${opportunityRecord.recordID}` }, 'OpportunityLineItem')).true
      expect(h.makeRecord.getCall(0).calledWith(quoteLineRecord.values, 'QuoteLineItem'))
      expect(h.saveRecord.getCall(2).calledWith(quoteLineRecord))
    })

    it('should inform if quote status is not "Draft" or "Needs Review"', async () => {
      opportunityRecord.values.AccountId = undefined
      await NewQuote.exec({ $record: opportunityRecord }, { Compose: h, ComposeUI: ui })

      expect(ui.warning.calledOnceWith('Please link the opportunity to an account before generating a quote')).true
      opportunityRecord.values.AccountId = '1'

    })
  })

  describe('error handling', () => {
    it('should throw error if findRecords 1 throws', async () => {
      h.findRecords.throws()

      expect(async () => await NewQuote.exec({ $record: opportunityRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if findRecordByID 1 throws', async () => {
      h.findRecords.onCall(0).resolves({ set: [opportunityContactRoleRecord] })
      h.findRecordByID.onCall(0).throws()

      expect(async () => await NewQuote.exec({ $record: opportunityRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if findRecordByID 2 throws', async () => {
      h.findRecords.onCall(0).resolves({ set: [opportunityContactRoleRecord] })
      h.findRecordByID.onCall(0).resolves(contactRecord)
      h.findRecordByID.onCall(1).throws()

      expect(async () => await NewQuote.exec({ $record: opportunityRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if findLastRecord throws', async () => {
      h.findRecords.onCall(0).resolves({ set: [opportunityContactRoleRecord] })
      h.findRecordByID.onCall(0).resolves(contactRecord)
      h.findRecordByID.onCall(1).resolves(accountRecord)
      h.findLastRecord.throws()

      expect(async () => await NewQuote.exec({ $record: opportunityRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if saveRecord 1 throws', async () => {
      h.findRecords.onCall(0).resolves({ set: [opportunityContactRoleRecord] })
      h.findRecordByID.onCall(0).resolves(contactRecord)
      h.findRecordByID.onCall(1).resolves(accountRecord)
      h.findLastRecord.resolves(settingsRecord)
      h.saveRecord.onCall(0).throws()

      expect(async () => await NewQuote.exec({ $record: opportunityRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if makeRecord 1 throws', async () => {
      h.findRecords.onCall(0).resolves({ set: [opportunityContactRoleRecord] })
      h.findRecordByID.onCall(0).resolves(contactRecord)
      h.findRecordByID.onCall(1).resolves(accountRecord)
      h.findLastRecord.resolves(settingsRecord)
      h.saveRecord.onCall(0).resolves(newSettingsRecord)
      h.makeRecord.onCall(0).throws()

      expect(async () => await NewQuote.exec({ $record: opportunityRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if saveRecord 2 throws', async () => {
      h.findRecords.onCall(0).resolves({ set: [opportunityContactRoleRecord] })
      h.findRecordByID.onCall(0).resolves(contactRecord)
      h.findRecordByID.onCall(1).resolves(accountRecord)
      h.findLastRecord.resolves(settingsRecord)
      h.saveRecord.onCall(0).resolves(newSettingsRecord)
      h.makeRecord.onCall(0).resolves(quoteRecord)
      h.saveRecord.onCall(1).throws()

      expect(async () => await NewQuote.exec({ $record: opportunityRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if findRecords 2 throws', async () => {
      h.findRecords.onCall(0).resolves({ set: [opportunityContactRoleRecord] })
      h.findRecordByID.onCall(0).resolves(contactRecord)
      h.findRecordByID.onCall(1).resolves(accountRecord)
      h.findLastRecord.resolves(settingsRecord)
      h.saveRecord.onCall(0).resolves(newSettingsRecord)
      h.makeRecord.onCall(0).resolves(quoteRecord)
      h.saveRecord.onCall(1).resolves(quoteRecord)
      h.findRecords.onCall(1).throws

      expect(async () => await NewQuote.exec({ $record: opportunityRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if makeRecord 2 throws', async () => {
      h.findRecords.onCall(0).resolves({ set: [opportunityContactRoleRecord] })
      h.findRecordByID.onCall(0).resolves(contactRecord)
      h.findRecordByID.onCall(1).resolves(accountRecord)
      h.findLastRecord.resolves(settingsRecord)
      h.saveRecord.onCall(0).resolves(newSettingsRecord)
      h.makeRecord.onCall(0).resolves(quoteRecord)
      h.saveRecord.onCall(1).resolves(quoteRecord)
      h.findRecords.onCall(1).resolves({ set: [opportunityLineRecord] })
      h.makeRecord.onCall(1).throws()

      expect(async () => await NewQuote.exec({ $record: opportunityRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if saveRecord 3 throws', async () => {
      h.findRecords.onCall(0).resolves({ set: [opportunityContactRoleRecord] })
      h.findRecordByID.onCall(0).resolves(contactRecord)
      h.findRecordByID.onCall(1).resolves(accountRecord)
      h.findLastRecord.resolves(settingsRecord)
      h.saveRecord.onCall(0).resolves(newSettingsRecord)
      h.makeRecord.onCall(0).resolves(quoteRecord)
      h.saveRecord.onCall(1).resolves(quoteRecord)
      h.findRecords.onCall(1).resolves({ set: [opportunityLineRecord] })
      h.makeRecord.onCall(1).resolves(quoteLineRecord)
      h.saveRecord.onCall(2).throws()

      expect(async () => await NewQuote.exec({ $record: opportunityRecord }, { Compose: h, ComposeUI: ui })).throws
    })
  })
})
