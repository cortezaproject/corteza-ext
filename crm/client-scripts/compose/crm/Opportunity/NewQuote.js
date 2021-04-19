// SPDX-FileCopyrightText: 2020, Jože Fortun, Tomaž Jerman, Denis Arh 
// SPDX-License-Identifier: Apache-2.0


import { getTimestamp } from '../../../../lib/lead/util'

export default {
  label: 'Create a new Quote for this Opportunity',
  description: 'Creates a new Quote record from an existing Opportunity',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .where('module', 'Opportunity')
      .where('namespace', 'crm')
      .uiProp('app', 'compose')
  },

  async exec ({ $record }, { Compose, ComposeUI }) {
    if (!$record.values.AccountId) {
      ComposeUI.warning('Please link the opportunity to an account before generating a quote.')
      return
    }

    const settings = await Compose.findLastRecord('Settings')
    // Map the quote number
    let nextQuoteNumber = settings.values.QuoteNextNumber
    if (!nextQuoteNumber || isNaN(nextQuoteNumber)) {
      nextQuoteNumber = 0
    }

    const account = await Compose.findRecordByID($record.values.AccountId, 'Account')
    let contact = await Compose.findRecords(`AccountId = ${account.recordID}`, 'Contact')
      .then(async ({ set: contacts }) => {
        if (contacts.length === 0) {
          return undefined
        }
        if (contacts.length === 1) {
          return contacts[0]
        }
        return contacts.find(({ values }) => values.IsPrimary)
      })

    // Do this so we don't need to worry about undefined values
    if (!contact) {
      contact = { values: {} }
    }

    // Create quote
    const quote = await Compose.saveRecord(Compose.makeRecord({
      ShippingHandling: 0,
      Status: 'Draft',
      Discount: 0,
      Tax: 0,
      OpportunityId: $record.recordID,
      GrandTotal: $record.values.Amount,
      PricebookId: $record.values.PricebookId,
      Name: $record.values.Name,
      Subtotal: $record.values.Amount,
      TotalPrice: $record.values.Amount,
      ContactId: contact.recordID,
      Email: contact.values.Email,
      Phone: contact.values.Phone,
      Fax: contact.values.Fax,
      AccountId: account.recordID,
      BillingStreet: account.values.BillingStreet,
      BillingCity: account.values.BillingCity,
      BillingState: account.values.BillingState,
      BillingPostalCode: account.values.BillingPostalCode,
      BillingCountry: account.values.BillingCountry,
      BillingName: account.values.AccountName,
      QuoteToStreet: account.values.BillingStreet,
      QuoteToCity: account.values.BillingCity,
      QuoteToState: account.values.BillingState,
      QuoteToPostalCode: account.values.BillingPostalCode,
      QuoteToCountry: account.values.BillingCountry,
      QuoteToName: account.values.AccountName,
      ShippingStreet: account.values.BillingStreet,
      ShippingCity: account.values.BillingCity,
      ShippingState: account.values.BillingState,
      ShippingPostalCode: account.values.BillingPostalCode,
      ShippingCountry: account.values.BillingCountry,
      ShippingName: account.values.AccountName,
      ExpirationDate: getTimestamp(settings.values.QuoteExpirationDays),
      QuoteNumber: nextQuoteNumber
    }, 'Quote'))

    // Map the list items
    const oppListItems = await Compose.findRecords({ filter: `OpportunityId = ${$record.recordID}` }, 'OpportunityLineItem')
      .then(({ set: oppListItems }) => oppListItems)

    for (const listItem of oppListItems) {
      Compose.saveRecord(Compose.makeRecord({
        Discount: listItem.values.Discount,
        Description: listItem.values.Description,
        ListPrice: listItem.values.ListPrice,
        PricebookEntryId: listItem.values.PricebookEntryId,
        ProductId: listItem.values.ProductId,
        ProductCode: listItem.values.ProductCode,
        Quantity: listItem.values.Quantity,
        UnitPrice: listItem.values.UnitPrice,
        Subtotal: listItem.values.Subtotal,
        TotalPrice: listItem.values.TotalPrice,
        QuoteId: quote.recordID
      }, 'QuoteLineItem'))
    }

    settings.values.QuoteNextNumber = parseInt(nextQuoteNumber, 10) + 1
    await Compose.saveRecord(settings)

    ComposeUI.success('The new quote has been created.')
    ComposeUI.gotoRecordEditor(quote)
  }
}
