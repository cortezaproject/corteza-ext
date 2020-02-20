import path from 'path'
import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'
import { stub, restore } from 'sinon'
import { corredor, apiClients, compose } from '@cortezaproject/corteza-js'
import CreateNewOpportunity from './CreateNewOpportunity'
const { ComposeHelper } = corredor
const { Record, getModuleFromYaml } = compose
const ComposeAPI = apiClients.Compose

describe(__filename, () => {
  let h,ui

  const modulesYaml = path.join(__dirname, '../../../../', 'config', '1100_modules.yaml')
  const recordID = '1'

  // Mock timestamp
  CreateNewOpportunity.getTimestamp = () => {
    return '1'
  }

  const settingsModule = getModuleFromYaml('Settings', modulesYaml)
  const settingsRecord = new Record(settingsModule)
  settingsRecord.recordID = recordID
  settingsRecord.values = {
    OpportunityCloseDateDays: 10,
    OpportunityProbability: 1,
    OpportunityForecaseCategory: 1,
    OpportunityStagename: 'Stagename',
  }
   
  const accountModule = getModuleFromYaml('Account', modulesYaml)
  const accountRecord = new Record(accountModule)
  accountRecord.recordID = recordID
  accountRecord.values = {
    OwnerId: '2',
    IsPrimary: '1',
    LeadSource: 'LeadSource',
  }

  const opportunityModule = getModuleFromYaml('Opportunity', modulesYaml)
  const newOpportunityRecord = new Record(opportunityModule)
  newOpportunityRecord.recordID = recordID
  newOpportunityRecord.values = {
    OwnerId: accountRecord.values.OwnerId,
    LeadSource: accountRecord.values.LeadSource,
    Name: '(unnamed)',
    AccountId: recordID,
    IsClosed: 'No',
    IsWon: 'No',
    CloseDate: CreateNewOpportunity.getTimestamp(),
    Probability: settingsRecord.values.OpportunityProbability,
    ForecastCategory: settingsRecord.values.OpportunityForecaseCategory,
    StageName: settingsRecord.values.OpportunityStagename
  }

  const opportunityContactRoleModule = getModuleFromYaml('OpportunityContactRole', modulesYaml)
  const newOpportunityContactRoleRecord = new Record(opportunityContactRoleModule)
  newOpportunityContactRoleRecord.values = {
    ContactId: accountRecord.recordID,
    OpportunityId: newOpportunityRecord.recordID,
    IsPrimary: '1'
  }

  beforeEach(() => {
    h = stub(new ComposeHelper({ ComposeAPI: new ComposeAPI({}) }))
    ui = stub({ 
      success: () => {},
      gotoRecordEditor: () => {}
    })
  })

  afterEach(() => {
    restore()
  })

  describe('successful creation', async () => {
    it('should successfully create opportunity from an account', async () => {
      h.findLastRecord.resolves(settingsRecord)
      h.findRecords.resolves({ set: [accountRecord] })
      h.makeRecord.onFirstCall().resolves(newOpportunityRecord)
      h.saveRecord.onFirstCall().resolves(newOpportunityRecord)
      h.makeRecord.onSecondCall().resolves(newOpportunityContactRoleRecord)
      h.saveRecord.onSecondCall().resolves(newOpportunityContactRoleRecord)

      await CreateNewOpportunity.exec({ $record: accountRecord }, { Compose: h, ComposeUI: ui })
      
      expect(h.findLastRecord.calledOnceWith('Settings')).true
      expect(h.findRecords.calledOnceWith(`AccountId = ${accountRecord.recordID}`, 'Contact')).true
      //expect(h.makeRecord.getCall(0).calledWith(newOpportunityRecord.values, 'Opportunity')).true
      expect(h.saveRecord.getCall(0).calledWith(newOpportunityRecord)).true
      expect(h.makeRecord.getCall(1).calledWith(newOpportunityContactRoleRecord.values, 'OpportunityContactRole')).true
      expect(h.saveRecord.getCall(1).calledWith(newOpportunityContactRoleRecord)).true
      expect(ui.success.calledOnceWith('The new opportunity has been created.')).true
      expect(ui.gotoRecordEditor.calledOnceWith(newOpportunityRecord)).true
    })
  })

  describe('error handling', () => {
    it('should throw error if findLastRecord throws', async () => {
      h.findLastRecord.throws()

      expect(async () => await CreateNewOpportunity.exec({ $record: accountRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if findRecords throws', async () => {
      h.findLastRecord.resolves(settingsRecord)
      h.findRecords.throws()

      expect(async () => await CreateNewOpportunity.exec({ $record: accountRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if makeRecord 1 throws', async () => {
      h.findLastRecord.resolves(settingsRecord)
      h.findRecords.resolves({ set: [accountRecord] })
      h.makeRecord.onFirstCall().throws()

      expect(async () => await CreateNewOpportunity.exec({ $record: accountRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if saveRecord 1 throws', async () => {
      h.findLastRecord.resolves(settingsRecord)
      h.findRecords.resolves({ set: [accountRecord] })
      h.makeRecord.onFirstCall().resolves(newOpportunityRecord)
      h.saveRecord.onFirstCall().throws()

      expect(async () => await CreateNewOpportunity.exec({ $record: accountRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if makeRecord 2 throws', async () => {
      h.findLastRecord.resolves(settingsRecord)
      h.findRecords.resolves({ set: [accountRecord] })
      h.makeRecord.onFirstCall().resolves(newOpportunityRecord)
      h.saveRecord.onFirstCall().resolves(newOpportunityRecord)
      h.makeRecord.onSecondCall().throws()

      expect(async () => await CreateNewOpportunity.exec({ $record: accountRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('If saveRecord 2 throws', async () => {
      h.findLastRecord.resolves(settingsRecord)
      h.findRecords.resolves({ set: [accountRecord] })
      h.makeRecord.onFirstCall().resolves(newOpportunityRecord)
      h.saveRecord.onFirstCall().resolves(newOpportunityRecord)
      h.makeRecord.onSecondCall().resolves(newOpportunityContactRoleRecord)
      h.saveRecord.onSecondCall().throws()

      expect(async () => await CreateNewOpportunity.exec({ $record: accountRecord }, { Compose: h, ComposeUI: ui })).throws
    })
  })
})
