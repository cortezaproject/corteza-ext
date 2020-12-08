export async function toAccountContact($record, Compose) {
  // Create an account
  const acc = await Compose.saveRecord(Compose.makeRecord({
    BillingStreet: $record.values.Street,
    BillingCity: $record.values.City,
    BillingState: $record.values.State,
    BillingPostalCode: $record.values.PostalCode,
    BillingCountry: $record.values.Country,
    ShippingStreet: $record.values.Street,
    ShippingCity: $record.values.City,
    ShippingState: $record.values.State,
    ShippingPostalCode: $record.values.PostalCode,
    ShippingCountry: $record.values.Country,
    AnnualRevenue: $record.values.AnnualRevenue,
    Description: $record.values.Description,
    AccountName: $record.values.Company,
    Fax: $record.values.Fax,
    Industry: $record.values.Industry,
    OwnerId: $record.values.OwnerId,
    AccountSource: $record.values.LeadSource,
    Phone: $record.values.Phone,
    NumberOfEmployees: $record.values.NumberOfEmployees,
    Rating: $record.values.Rating,
    Website: $record.values.Website,
    Twitter: $record.values.Twitter,
    Facebook: $record.values.Facebook,
    LinkedIn: $record.values.LinkedIn,
    CampaignId: $record.values.CampaignId
  }, 'Account'))

  // Create a contact
  const contact = await Compose.saveRecord(Compose.makeRecord({
    MailingStreet: $record.values.Street,
    MailingCity: $record.values.City,
    MailingState: $record.values.State,
    MailingPostalCode: $record.values.PostalCode,
    MailingCountry: $record.values.Country,
    Description: $record.values.Description,
    DoNotCall: $record.values.DoNotCall,
    Email: $record.values.Email,
    HasOptedOutOfEmail: $record.values.HasOptedOutOfEmail,
    Fax: $record.values.Fax,
    HasOptedOutOfFax: $record.values.HasOptedOutOfFax,
    OwnerId: $record.values.OwnerId,
    LeadSource: $record.values.LeadSource,
    Website: $record.values.Website,
    Twitter: $record.values.Twitter,
    Facebook: $record.values.Facebook,
    LinkedIn: $record.values.LinkedIn,
    Salutation: $record.values.Salutation,
    FirstName: $record.values.FirstName,
    LastName: $record.values.LastName,
    MobilePhone: $record.values.MobilePhone,
    Phone: $record.values.Phone,
    Title: $record.values.Title,
    IsPrimary: '1',
    AccountId: acc.recordID,
    CampaignId: $record.values.CampaignId
  }, 'Contact'))

  return { account: acc, contact }
}

export function getTimestamp (ocd) {
  const m = new Date()
  m.setDate(m.getDate() + parseInt(ocd, 10))
  return m.toISOString()
}
