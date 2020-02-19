import path from 'path'
import { describe, it, beforeEach } from 'mocha'
import { expect } from 'chai'
import { stub } from 'sinon'
import { corredor, apiClients, compose } from '@cortezaproject/corteza-js'
import ApplyPriceBook from './ApplyPriceBook'
const { Record, getModuleFromYaml } = compose
const { ComposeHelper } = corredor
const ComposeAPI = apiClients.Compose

describe(__filename, () => {
  let h,ui
  const modulesYaml = path.join(__dirname, '..', '..', '..', '..', 'config', '1100_modules.yaml')
  const recordID = '1'

  const pricebookModule = getModuleFromYaml('Pricebook', modulesYaml)
  const pricebookRecord = new Record(pricebookModule)
  pricebookRecord.recordID = recordID
  pricebookRecord.values = {
    IsStandard: '1',
  }

  const opportunityModule = getModuleFromYaml('Opportunity', modulesYaml)
  const opportunityRecord = new Record(opportunityModule)
  opportunityRecord.recordID = recordID
  opportunityRecord.values = {
    PricebookId: '1',
  }

  const lineitemModule = getModuleFromYaml('OpportunityLineItem', modulesYaml)
  const lineitemRecord = new Record(lineitemModule)
  lineitemRecord.recordID = recordID
  lineitemRecord.values = {
    ProductId: '1',
    Quantity: 1,
    Discount: 0,
    UnitPrice: 1,
  }

  const productModule = getModuleFromYaml('Product', modulesYaml)
  const productRecord = new Record(productModule)
  productRecord.recordID = recordID
  productRecord.values = {
    Name: 'ProductName',
    ProductCode: '1',
  }

  const pricebookEntryModule = getModuleFromYaml('PricebookEntry', modulesYaml)
  const pricebookEntryRecord = new Record(pricebookEntryModule)
  pricebookEntryRecord.recordID = recordID
  pricebookEntryRecord.values = {
    UnitPrice: 1,
  }

  const newLineitemRecord = new Record(lineitemModule)
  newLineitemRecord.recordID = recordID
  newLineitemRecord.values = {
    ...lineitemRecord.values,
    Name: productRecord.values.Name,
    ProductCode: productRecord.values.ProductCode,
    ListPrice: pricebookEntryRecord.values.UnitPrice,
    UnitPrice: lineitemRecord.values.UnitPrice,
    Subtotal: lineitemRecord.values.UnitPrice * lineitemRecord.values.Quantity,
    TotalPrice: lineitemRecord.values.UnitPrice * lineitemRecord.values.Quantity - lineitemRecord.values.Discount
  }

  const newOpportunityRecord = new Record(opportunityModule)
  newOpportunityRecord.recordID = recordID
  newOpportunityRecord.values = {
    ...opportunityRecord.values,
    Amount: newLineitemRecord.values.TotalPrice,
  }


  beforeEach(() => {
    h = stub(new ComposeHelper({ ComposeAPI: new ComposeAPI({}) }))
    ui = stub({ 
      success: () => {},
      warning: () => {},
      gotoRecordEditor: () => {}
    })
  })

  describe('successful creation', () => {
    it('should successfully ApplyPriceBook if Pricebook exists', async () => {
      h.findRecords.onCall(0).resolves({ set: [lineitemRecord] })
      h.findRecordByID.resolves(productRecord)
      h.findRecords.onCall(1).resolves({ set: [pricebookEntryRecord] })

      await ApplyPriceBook.exec({ $record: opportunityRecord }, { Compose: h, ComposeUI: ui })

      expect(h.findRecords.getCall(0).calledWith(`OpportunityId = ${opportunityRecord.recordID}`, 'OpportunityLineItem')).true
      expect(h.findRecordByID.calledOnceWith(lineitemRecord.values.ProductId, 'Product'))
      expect(h.findRecords.getCall(1).calledWith(`PricebookId = ${opportunityRecord.values.PricebookId} AND ProductId = ${lineitemRecord.values.ProductId}`, 'PricebookEntry')).true
      expect(h.saveRecord.getCall(0).calledWith(newLineitemRecord)).true
      expect(h.saveRecord.getCall(1).calledWith(newOpportunityRecord)).true
    })

    it('should successfully ApplyPriceBook if Pricebook doesnt exist', async () => {
      opportunityRecord.values.PricebookId = undefined
      h.findRecords.onCall(0).resolves({ set: [pricebookRecord] })
      h.saveRecord.onCall(0).resolves(opportunityRecord)
      h.findRecords.onCall(1).resolves({ set: [lineitemRecord] })
      h.findRecordByID.resolves(productRecord)
      h.findRecords.onCall(2).resolves({ set: [pricebookEntryRecord] })

      await ApplyPriceBook.exec({ $record: opportunityRecord }, { Compose: h, ComposeUI: ui })

      expect(h.findRecords.getCall(0).calledWith('IsActive = 1', 'Pricebook')).true
      expect(h.saveRecord.getCall(0).calledWith(opportunityRecord)).true
      expect(h.findRecords.getCall(1).calledWith(`OpportunityId = ${opportunityRecord.recordID}`, 'OpportunityLineItem')).true
      expect(h.findRecordByID.calledOnceWith(lineitemRecord.values.ProductId, 'Product'))
      expect(h.findRecords.getCall(2).calledWith(`PricebookId = ${opportunityRecord.values.PricebookId} AND ProductId = ${lineitemRecord.values.ProductId}`, 'PricebookEntry')).true
      expect(h.saveRecord.getCall(1).calledWith(newLineitemRecord)).true
      expect(h.saveRecord.getCall(2).calledWith(newOpportunityRecord)).true
      opportunityRecord.values.PricebookId = '1'
    })
  })

  describe('error handling', () => {
    opportunityRecord.values.PricebookId = undefined

    it('should throw error if findRecords 1 throws', async () => {
      h.findLastRecord.onCall(0).throws()

      expect(async () => await ApplyPriceBook.exec({ $record: opportunityRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if saveRecord 1 throws', async () => {
      h.findRecords.onCall(0).resolves({ set: [pricebookRecord] })
      h.saveRecord.onCall(0).throws()

      expect(async () => await ApplyPriceBook.exec({ $record: opportunityRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if findRecords 2 throws', async () => {
      h.findRecords.onCall(0).resolves({ set: [pricebookRecord] })
      h.saveRecord.onCall(0).resolves(opportunityRecord)
      h.findRecords.onCall(1).throws()

      expect(async () => await ApplyPriceBook.exec({ $record: opportunityRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if findRecordByID 2 throws', async () => {
      h.findRecords.onCall(0).resolves({ set: [pricebookRecord] })
      h.saveRecord.onCall(0).resolves(opportunityRecord)
      h.findRecords.onCall(1).resolves({ set: [lineitemRecord] })
      h.findRecordByID.throws()

      expect(async () => await ApplyPriceBook.exec({ $record: opportunityRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if findRecords 3 throws', async () => {
      h.findRecords.onCall(0).resolves({ set: [pricebookRecord] })
      h.saveRecord.onCall(0).resolves(opportunityRecord)
      h.findRecords.onCall(1).resolves({ set: [lineitemRecord] })
      h.findRecordByID.resolves(productRecord)
      h.findRecords.onCall(2).throws()

      expect(async () => await ApplyPriceBook.exec({ $record: opportunityRecord }, { Compose: h, ComposeUI: ui })).throws
    })
    opportunityRecord.values.PricebookId = '1'
  })
})
