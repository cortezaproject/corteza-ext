import path from 'path'
import { describe, it, beforeEach } from 'mocha'
import { expect } from 'chai'
import { stub } from 'sinon'
import { corredor, apiClients, compose } from '@cortezaproject/corteza-js'
import ToAccount from './ToAccount'
const { Record, getModuleFromYaml } = compose
const { ComposeHelper, SystemHelper } = corredor
const ComposeAPI = apiClients.Compose
const SystemAPI = apiClients.System

describe(__filename, () => {
  let h, s, ui
  const modulesYaml = path.join(__dirname, '..', '..', '..', '..', 'config', '1100_modules.yaml')
  const recordID = '1'

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
  }

  const accountModule = getModuleFromYaml('Account', modulesYaml)
  const accountRecord = new Record(accountModule)
  accountRecord.recordID = recordID
  accountRecord.values = {
    BillingStreet: leadRecord.values.Street,
    BillingCity: leadRecord.values.City,
    BillingState: leadRecord.values.State,
    BillingPostalCode: leadRecord.values.PostalCode,
    BillingCountry: leadRecord.values.Country,
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

  const newLeadRecord = new Record(leadModule)
  newLeadRecord.recordID = recordID
  newLeadRecord.values = {
    ...leadRecord.values,
    Status: 'Converted',
    IsConverted: 'Yes',
    ConvertedAccountId: accountRecord.recordID,
    ConvertedContactId: accountRecord.recordID,
    ConvertedDate: accountRecord.createdAt
  }

  const user = {
    email: 'mail'
  }

  beforeEach(() => {
    h = stub(new ComposeHelper({ ComposeAPI: new ComposeAPI({}) }))
    s = stub(new SystemHelper({ ComposeAPI: new SystemAPI({}) }))
    ui = stub({ 
      success: () => {},
      warning: () => {},
      gotoRecordEditor: () => {}
    })
  })

  describe('successful convert', () => {
    it('should successfully convert lead to account', async () => {
      h.makeRecord.onCall(0).resolves(accountRecord)
      h.saveRecord.onCall(0).resolves(accountRecord)
      h.makeRecord.onCall(1).resolves(contactRecord)
      h.saveRecord.onCall(1).resolves(contactRecord)
      h.saveRecord.onCall(2).resolves(newLeadRecord)
      s.findUserByID.resolves(user)

      await ToAccount.exec({ $record: leadRecord }, { Compose: h, ComposeUI: ui, System: s })
      
      expect(h.makeRecord.getCall(0).calledWith(accountRecord.values, 'Account')).true
      expect(h.saveRecord.getCall(0).calledWith(accountRecord)).true
      expect(h.makeRecord.getCall(1).calledWith(contactRecord.values, 'Contact')).true
      expect(h.saveRecord.getCall(1).calledWith(contactRecord)).true
      expect(h.saveRecord.getCall(2).calledWith(newLeadRecord)).true
      expect(s.findUserByID.calledOnceWith(newLeadRecord.values.OwnerId)).true

      const to = user.email
      const subject =  'Lead ' + leadRecord.values.FirstName + ' ' + leadRecord.values.LastName + ' from ' + leadRecord.values.Company + ' has been converted'
      const html = { header: '<h1>The following lead has been converted:</h1>' }
      expect(h.sendRecordToMail.calledOnceWith(to, subject, html, accountRecord )).true
      expect(ui.success.calledOnceWith('The lead has been converted.')).true
      expect(ui.gotoRecordEditor.calledOnceWith(accountRecord)).true
    })

    it('should inform if lead is already converted', async () => {
      leadRecord.values.Status = 'Converted'

      await ToAccount.exec({ $record: leadRecord }, { Compose: h, ComposeUI: ui, System: s })
      
      expect(ui.warning.calledOnceWith('This lead is already converted.')).true
      leadRecord.values.Status = undefined
    })
  })

  describe('error handling', () => {
    it('should throw error if makeRecord 1 throws', async () => {
      h.makeRecord.onCall(0).throws()

      expect(async () => await ToAccount.exec({ $record: leadRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if saveRecord 1 throws', async () => {
      h.makeRecord.onCall(0).resolves(accountRecord)
      h.saveRecord.onCall(0).throws()

      expect(async () => await ToAccount.exec({ $record: leadRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if makeRecord 2 throws', async () => {
      h.makeRecord.onCall(0).resolves(accountRecord)
      h.saveRecord.onCall(0).resolves(accountRecord)
      h.makeRecord.onCall(1).throws()

      expect(async () => await ToAccount.exec({ $record: leadRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if saveRecord 2 throws', async () => {
      h.makeRecord.onCall(0).resolves(accountRecord)
      h.saveRecord.onCall(0).resolves(accountRecord)
      h.makeRecord.onCall(1).resolves(contactRecord)
      h.saveRecord.onCall(1).throws()

      expect(async () => await ToAccount.exec({ $record: leadRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if saveRecord 3 throws', async () => {
      h.makeRecord.onCall(0).resolves(accountRecord)
      h.saveRecord.onCall(0).resolves(accountRecord)
      h.makeRecord.onCall(1).resolves(contactRecord)
      h.saveRecord.onCall(1).resolves(contactRecord)
      h.saveRecord.onCall(2).throws()

      expect(async () => await ToAccount.exec({ $record: leadRecord }, { Compose: h, ComposeUI: ui })).throws
    })

    it('should throw error if findUserByID throws', async () => {
      h.makeRecord.onCall(0).resolves(accountRecord)
      h.saveRecord.onCall(0).resolves(accountRecord)
      h.makeRecord.onCall(1).resolves(contactRecord)
      h.saveRecord.onCall(1).resolves(contactRecord)
      h.saveRecord.onCall(2).resolves(newLeadRecord)
      s.findUserByID.throws()


      expect(async () => await ToAccount.exec({ $record: leadRecord }, { Compose: h, ComposeUI: ui })).throws
    })
  })
})
