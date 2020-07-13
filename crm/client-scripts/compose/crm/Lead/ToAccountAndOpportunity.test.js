import path from 'path'
import { describe, it, beforeEach, afterEach } from 'mocha'
import { expect } from 'chai'
import { stub, restore } from 'sinon'
import { corredor, apiClients, compose } from '@cortezaproject/corteza-js'
import ToAccountAndOpportunity from './ToAccountAndOpportunity'
const { Record, getModuleFromYaml } = compose
const { ComposeHelper, SystemHelper } = corredor
const ComposeAPI = apiClients.Compose
const SystemAPI = apiClients.System

describe(__filename, () => {
  let h, s, ui
  const modulesYaml = path.join(__dirname, '../../../../', 'config', '1100_modules.yaml')
  const recordID = '1'

  // Mock timestamp
  ToAccountAndOpportunity.getTimestamp = () => {
    return '1'
  }

  const settingsModule = getModuleFromYaml('Settings', modulesYaml)
  const settingsRecord = new Record(settingsModule)
  settingsRecord.recordID = recordID
  settingsRecord.values = {
    OpportunityCloseDateDays: 1,
    OpportunityProbability: 1,
    OpportunityForecaseCategory: 1,
    OpportunityStagename: 'Name'
  }

  const leadModule = getModuleFromYaml('Lead', modulesYaml)
  const leadRecord = new Record(leadModule)
  leadRecord.recordID = recordID
  leadRecord.values = {
    Street: 'Street',
    City: 'City',
    State: 'State',
    PostalCode: 'PostalCode',
    Country: 'Country',
    Description: 'Description',
    AnnualRevenue: 'AnnualRevenue',
    Company: 'Company',
    Fax: 'Fax',
    HasOptedOutOfFax: 'HasOptedOutOfFax',
    Industry: 'Industry',
    OwnerId: 'OwnerId',
    LeadSource: 'LeadSource',
    Phone: 'Phone',
    Email: 'Email',
    HasOptedOutOfEmail: 'HasOptedOutOfEmail',
    NumberOfEmployees: 'NumberOfEmployees',
    Rating: 'Rating',
    Website: 'Website',
    Twitter: 'Twitter',
    Facebook: 'Facebook',
    LinkedIn: 'LinkedIn',
    DoNotCall: 'DoNotCall',
    Salutation: 'Salutation',
    FirstName: 'FirstName',
    LastName: 'LastName',
    MobilePhone: 'MobilePhone',
    Title: 'Title',
    CampaignId: ['1', '2'],
  }

  const { Street, City, State, PostalCode, Country } = leadRecord.values

  const accountModule = getModuleFromYaml('Account', modulesYaml)
  const accountRecord = new Record(accountModule)
  accountRecord.recordID = recordID
  accountRecord.createdAt = new Date()
  accountRecord.values = {
    BillingStreet: Street,
    BillingCity: City,
    BillingState: State,
    BillingPostalCode: PostalCode,
    BillingCountry: Country,
    ShippingStreet: Street,
    ShippingCity: City,
    ShippingState: State,
    ShippingPostalCode: PostalCode,
    ShippingCountry: Country,
    AnnualRevenue: leadRecord.values.AnnualRevenue,
    AccountName: leadRecord.values.Company,
    Description: leadRecord.values.Description,
    Fax: leadRecord.values.Fax,
    Industry: leadRecord.values.Industry,
    OwnerId: leadRecord.values.OwnerId,
    AccountSource: leadRecord.values.LeadSource,
    Phone: leadRecord.values.Phone,
    NumberOfEmployees: leadRecord.values.NumberOfEmployees,
    Rating: leadRecord.values.Rating,
    Website: leadRecord.values.Website,
    Twitter: leadRecord.values.Twitter,
    Facebook: leadRecord.values.Facebook,
    LinkedIn: leadRecord.values.LinkedIn
  }


  const contactModule = getModuleFromYaml('Contact', modulesYaml)
  const contactRecord = new Record(contactModule)
  contactRecord.recordID = recordID
  contactRecord.values = {
    MailingStreet: leadRecord.values.Street,
    MailingCity: leadRecord.values.City,
    MailingState: leadRecord.values.State,
    MailingPostalCode: leadRecord.values.PostalCode,
    MailingCountry: leadRecord.values.Country,
    Description: leadRecord.values.Description,
    DoNotCall: leadRecord.values.DoNotCall,
    Email: leadRecord.values.Email,
    HasOptedOutOfEmail: leadRecord.values.HasOptedOutOfEmail,
    Fax: leadRecord.values.Fax,
    HasOptedOutOfFax: leadRecord.values.HasOptedOutOfFax,
    OwnerId: leadRecord.values.OwnerId,
    LeadSource: leadRecord.values.LeadSource,
    Website: leadRecord.values.Website,
    Twitter: leadRecord.values.Twitter,
    Facebook: leadRecord.values.Facebook,
    LinkedIn: leadRecord.values.LinkedIn,
    Salutation: leadRecord.values.Salutation,
    FirstName: leadRecord.values.FirstName,
    LastName: leadRecord.values.LastName,
    MobilePhone: leadRecord.values.MobilePhone,
    Phone: leadRecord.values.Phone,
    Title: leadRecord.values.Title,
    IsPrimary: '1',
    AccountId: accountRecord.recordID
  }

  const opportunityModule = getModuleFromYaml('Opportunity', modulesYaml)
  const opportunityRecord = new Record(opportunityModule)
  opportunityRecord.recordID = recordID
  opportunityRecord.values = {
    Description: leadRecord.values.Description,
    OwnerId: leadRecord.values.OwnerId,
    LeadSource: leadRecord.values.LeadSource,
    Name: '(unnamed)',
    AccountId: accountRecord.recordID,
    IsClosed: 'No',
    IsWon: 'No',
    CloseDate: ToAccountAndOpportunity.getTimestamp(settingsRecord.values.OpportunityCloseDateDays),
    Probability: settingsRecord.values.OpportunityProbability,
    ForecastCategory: settingsRecord.values.OpportunityForecaseCategory,
    StageName: settingsRecord.values.OpportunityStagename,
    CampaignId: '1'
  }

  const opportunityContactRoleModule = getModuleFromYaml('OpportunityContactRole', modulesYaml)
  const opportunityContactRoleRecord = new Record(opportunityContactRoleModule)
  opportunityContactRoleRecord.values = {
    ContactId: contactRecord.recordID,
    OpportunityId: opportunityRecord.recordID,
    IsPrimary: '1'
  }

  const newLeadRecord = new Record(leadModule)
  newLeadRecord.recordID = recordID
  newLeadRecord.values = {
    ...leadRecord.values,
    Status: 'Converted',
    IsConverted: 'Yes',
    ConvertedAccountId: accountRecord.recordID,
    ConvertedContactId: accountRecord.recordID,
    ConvertedDate: accountRecord.createdAt.toISOString()
  }

  const campaignModule = getModuleFromYaml('Campaigns', modulesYaml)
  const campaignRecord1 = new Record(campaignModule)
  campaignRecord1.recordID = '1'

  const campaignRecord2 = new Record(campaignModule)
  campaignRecord2.recordID = '2'

  const user = {
    email: 'mail'
  }
  

  beforeEach(() => {
    h = stub(new ComposeHelper({ ComposeAPI: new ComposeAPI({}) }))
    s = stub(new SystemHelper({ ComposeAPI: new SystemAPI({}) }))
    ui = stub({ 
      success: () => {},
      gotoRecordViewer: () => {}
    })
  })

  afterEach(() => {
    restore()
  })

  describe('successful convert', () => {
    it('should successfully convert lead to account', async () => {
      h.makeRecord.onCall(0).resolves(accountRecord)
      h.saveRecord.onCall(0).resolves(accountRecord)
      h.makeRecord.onCall(1).resolves(contactRecord)
      h.saveRecord.onCall(1).resolves(contactRecord)
      h.findLastRecord.resolves(settingsRecord)
      h.findRecords.resolves({set: [campaignRecord1, campaignRecord2] })
      h.makeRecord.onCall(2).resolves(opportunityRecord)
      h.saveRecord.onCall(2).resolves(opportunityRecord)
      h.makeRecord.onCall(3).resolves(opportunityContactRoleRecord)
      h.saveRecord.onCall(3).resolves(opportunityContactRoleRecord)
      h.saveRecord.onCall(4).resolves(newLeadRecord)
      s.findUserByID.resolves(user)

      await ToAccountAndOpportunity.exec({ $record: leadRecord }, { Compose: h, ComposeUI: ui, System: s })
      
      expect(h.makeRecord.getCall(0).calledWith(accountRecord.values, 'Account')).true
      expect(h.saveRecord.getCall(0).calledWith(accountRecord)).true
      expect(h.makeRecord.getCall(1).calledWith(contactRecord.values, 'Contact')).true
      expect(h.saveRecord.getCall(1).calledWith(contactRecord)).true
      expect(h.findLastRecord.calledOnceWith('Settings')).true
      expect(h.findRecords.calledOnceWith({ filter: `${leadRecord.values.CampaignId.join('OR')}`, sort: 'createdAt DESC'}, 'Campaigns')).true
      expect(h.makeRecord.getCall(2).calledWith(opportunityRecord.values, 'Opportunity')).true
      expect(h.saveRecord.getCall(2).calledWith(opportunityRecord)).true
      expect(h.makeRecord.getCall(3).calledWith(opportunityContactRoleRecord.values, 'OpportunityContactRole')).true
      expect(h.saveRecord.getCall(3).calledWith(opportunityContactRoleRecord)).true
      expect(s.findUserByID.calledOnceWith(newLeadRecord.values.OwnerId)).true

      const to = user.email
      const subject =  'Lead ' + leadRecord.values.FirstName + ' ' + leadRecord.values.LastName + ' from ' + leadRecord.values.Company + ' has been converted'
      const html = { header: '<h1>The following lead has been converted:</h1>' }
      expect(h.sendRecordToMail.calledOnceWith(to, subject, html, accountRecord )).true
      expect(ui.success.calledOnceWith('The lead has been converted.')).true
      expect(ui.gotoRecordViewer.calledOnceWith(opportunityRecord)).true
    })
  })

  describe('error handling', () => {
    it('should throw error if makeRecord 1 throws', async () => {
      h.makeRecord.onCall(0).throws()

      expect(async () => await ToAccountAndOpportunity.exec({ $record: leadRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if saveRecord 1 throws', async () => {
      h.makeRecord.onCall(0).resolves(accountRecord)
      h.saveRecord.onCall(0).throws()

      expect(async () => await ToAccountAndOpportunity.exec({ $record: leadRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if makeRecord 2 throws', async () => {
      h.makeRecord.onCall(0).resolves(accountRecord)
      h.saveRecord.onCall(0).resolves(accountRecord)
      h.makeRecord.onCall(1).throws()

      expect(async () => await ToAccountAndOpportunity.exec({ $record: leadRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if saveRecord 2 throws', async () => {
      h.makeRecord.onCall(0).resolves(accountRecord)
      h.saveRecord.onCall(0).resolves(accountRecord)
      h.makeRecord.onCall(1).resolves(contactRecord)
      h.saveRecord.onCall(1).throws()

      expect(async () => await ToAccountAndOpportunity.exec({ $record: leadRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if findLastRecord throws', async () => {
      h.makeRecord.onCall(0).resolves(accountRecord)
      h.saveRecord.onCall(0).resolves(accountRecord)
      h.makeRecord.onCall(1).resolves(contactRecord)
      h.saveRecord.onCall(1).resolves(contactRecord)
      h.findLastRecord.throws()

      expect(async () => await ToAccountAndOpportunity.exec({ $record: leadRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if makeRecord 3 throws', async () => {
      h.makeRecord.onCall(0).resolves(accountRecord)
      h.saveRecord.onCall(0).resolves(accountRecord)
      h.makeRecord.onCall(1).resolves(contactRecord)
      h.saveRecord.onCall(1).resolves(contactRecord)
      h.findLastRecord.resolves(settingsRecord)
      h.makeRecord.onCall(2).throws()


      expect(async () => await ToAccountAndOpportunity.exec({ $record: leadRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if saveRecord 3 throws', async () => {
      h.makeRecord.onCall(0).resolves(accountRecord)
      h.saveRecord.onCall(0).resolves(accountRecord)
      h.makeRecord.onCall(1).resolves(contactRecord)
      h.saveRecord.onCall(1).resolves(contactRecord)
      h.findLastRecord.resolves(settingsRecord)
      h.makeRecord.onCall(2).resolves(opportunityRecord)
      h.saveRecord.onCall(2).throws()


      expect(async () => await ToAccountAndOpportunity.exec({ $record: leadRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if makeRecord 4 throws', async () => {
      h.makeRecord.onCall(0).resolves(accountRecord)
      h.saveRecord.onCall(0).resolves(accountRecord)
      h.makeRecord.onCall(1).resolves(contactRecord)
      h.saveRecord.onCall(1).resolves(contactRecord)
      h.findLastRecord.resolves(settingsRecord)
      h.makeRecord.onCall(2).resolves(opportunityRecord)
      h.saveRecord.onCall(2).resolves(opportunityRecord)
      h.makeRecord.onCall(3).throws()

      expect(async () => await ToAccountAndOpportunity.exec({ $record: leadRecord }, { Compose: h, ComposeUI: ui })).throws
    })


    it('should throw error if saveRecord 4 throws', async () => {
      h.makeRecord.onCall(0).resolves(accountRecord)
      h.saveRecord.onCall(0).resolves(accountRecord)
      h.makeRecord.onCall(1).resolves(contactRecord)
      h.saveRecord.onCall(1).resolves(contactRecord)
      h.findLastRecord.resolves(settingsRecord)
      h.makeRecord.onCall(2).resolves(opportunityRecord)
      h.saveRecord.onCall(2).resolves(opportunityRecord)
      h.makeRecord.onCall(3).resolves(opportunityContactRoleRecord)
      h.saveRecord.onCall(3).throws()

      expect(async () => await ToAccountAndOpportunity.exec({ $record: leadRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if saveRecord 5 throws', async () => {
      h.makeRecord.onCall(0).resolves(accountRecord)
      h.saveRecord.onCall(0).resolves(accountRecord)
      h.makeRecord.onCall(1).resolves(contactRecord)
      h.saveRecord.onCall(1).resolves(contactRecord)
      h.findLastRecord.resolves(settingsRecord)
      h.makeRecord.onCall(2).resolves(opportunityRecord)
      h.saveRecord.onCall(2).resolves(opportunityRecord)
      h.makeRecord.onCall(3).resolves(opportunityContactRoleRecord)
      h.saveRecord.onCall(3).resolves(opportunityContactRoleRecord)
      h.saveRecord.onCall(4).throws()

      expect(async () => await ToAccountAndOpportunity.exec({ $record: leadRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if findUserByID throws', async () => {
      h.makeRecord.onCall(0).resolves(accountRecord)
      h.saveRecord.onCall(0).resolves(accountRecord)
      h.makeRecord.onCall(1).resolves(contactRecord)
      h.saveRecord.onCall(1).resolves(contactRecord)
      h.findLastRecord.resolves(settingsRecord)
      h.makeRecord.onCall(2).resolves(opportunityRecord)
      h.saveRecord.onCall(2).resolves(opportunityRecord)
      h.makeRecord.onCall(3).resolves(opportunityContactRoleRecord)
      h.saveRecord.onCall(3).resolves(opportunityContactRoleRecord)
      h.saveRecord.onCall(4).resolves(newLeadRecord)
      s.findUserByID.throws()

      expect(async () => await ToAccountAndOpportunity.exec({ $record: leadRecord }, { Compose: h, ComposeUI: ui })).throws
    })
  })
})
