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

  getTimestamp (quoteExpirationDays) {
    const m = new Date()
    m.setDate(m.getDate() + parseInt(quoteExpirationDays, 10))
    return m.toISOString()
  },

  async exec ({ $record }, { Compose, ComposeUI }) {
    // Check if there is a related account, to map the fields of the account
    if (!$record.values.AccountId) {
      // Exit when there is no account related to the opportunity.
      ComposeUI.warning('Please link the opportunity to an account before generating a quote')
      return
    }

    let quoteContactId
    let quoteEmail
    let quotePhone
    let quoteFax
    let quoteAccountId
    let quoteBillingStreet
    let quoteBillingCity
    let quoteBillingState
    let quoteBillingPostalCode
    let quoteBillingCountry
    let quoteBillingName
    let quoteToStreet
    let quoteToCity
    let quoteToState
    let quoteToPostalCode
    let quoteToCountry
    let quoteToName
    let quoteShippingStreet
    let quoteShippingCity
    let quoteShippingState
    let quoteShippingPostalCode
    let quoteShippingCountry
    let quoteShippingName
    let quoteExpirationDate
    let quoteNumber

    // Get the related account
    const account = await Compose.findRecordByID($record.values.AccountId, 'Account')

    // Get the primary contact for the quote
    return Compose.findRecords(`AccountId = ${account.recordID}`, 'Contact')
      .catch(() => ({ set: [] }))
      .then(async ({ set }) => {
        let primary_contact

        if (set.length === 1) {
          // Get the contact
          primary_contact = set[0]
        } else {
          // Loop through the contacts of the account, to save the primary contact
          primary_contact = set.find(r => r.values.IsPrimary === '1')
        }
      
        // If we have the primary contact, continue to add it to the quote. Else, skip this block
        if (primary_contact) {
          quoteContactId = primary_contact.recordID
          quoteEmail = primary_contact.values.Email
          quotePhone = primary_contact.values.Phone
          quoteFax = primary_contact.values.Fax
        }
        quoteAccountId = account.recordID,
        quoteBillingStreet = account.values.BillingStreet,
        quoteBillingCity = account.values.BillingCity,
        quoteBillingState = account.values.BillingState,
        quoteBillingPostalCode = account.values.BillingPostalCode,
        quoteBillingCountry = account.values.BillingCountry,
        quoteBillingName = account.values.AccountName,
        quoteToStreet = account.values.BillingStreet,
        quoteToCity = account.values.BillingCity,
        quoteToState = account.values.BillingState,
        quoteToPostalCode = account.values.BillingPostalCode,
        quoteToCountry = account.values.BillingCountry,
        quoteToName = account.values.AccountName,
        quoteShippingStreet = account.values.BillingStreet,
        quoteShippingCity = account.values.BillingCity,
        quoteShippingState = account.values.BillingState,
        quoteShippingPostalCode = account.values.BillingPostalCode,
        quoteShippingCountry = account.values.BillingCountry,
        quoteShippingName = account.values.AccountName

        // Get the default settings
        return Compose.findLastRecord('Settings')
          .then(async settings => {
            // Get the expiration date
            const quoteExpirationDays = settings.values.QuoteExpirationDays

            // Calculate the expiration date
            const expirationDate = this.getTimestamp(quoteExpirationDays)

            // Save the date
            quoteExpirationDate = expirationDate

            // Map the quote number
            let nextQuoteNumber = settings.values.QuoteNextNumber
            if (!nextQuoteNumber || isNaN(nextQuoteNumber)) {
              nextQuoteNumber = 0
            }
            quoteNumber = nextQuoteNumber
            const nextQuoteNumberUpdated = parseInt(nextQuoteNumber, 10) + 1

            // Update the config
            settings.values.QuoteNextNumber = nextQuoteNumberUpdated
            await Compose.saveRecord(settings)

            // Create a new quote record for the opportunity
            return Compose.makeRecord({
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
              ContactId: quoteContactId,
              Email: quoteEmail,
              Phone: quotePhone,
              Fax: quoteFax,
              AccountId: quoteAccountId,
              BillingStreet: quoteBillingStreet,
              BillingCity: quoteBillingCity,
              BillingState: quoteBillingState,
              BillingPostalCode: quoteBillingPostalCode,
              BillingCountry: quoteBillingCountry,
              BillingName: quoteBillingName,
              QuoteToStreet: quoteToStreet,
              QuoteToCity: quoteToCity,
              QuoteToState: quoteToState,
              QuoteToPostalCode: quoteToPostalCode,
              QuoteToCountry: quoteToCountry,
              QuoteToName: quoteToName,
              ShippingStreet: quoteShippingStreet,
              ShippingCity: quoteShippingCity,
              ShippingState: quoteShippingState,
              ShippingPostalCode: quoteShippingPostalCode,
              ShippingCountry: quoteShippingCountry,
              ShippingName: quoteShippingName,
              ExpirationDate: quoteExpirationDate,
              QuoteNumber: quoteNumber
            }, 'Quote')
              .then(async myQuote => {
                const mySavedQuote = await Compose.saveRecord(myQuote)

                // Get the list of products from the opportunity to the quote
                // @todo improve!
                return Compose.findRecords({ filter: `OpportunityId = ${$record.recordID}` }, 'OpportunityLineItem')
                  .catch(() => ({ set: [] }))
                  .then(({ set }) => {
                    // Loop through the lineitems related to the opportunity
                    set.forEach(r => {
                      // Create a new contact linked to the opportunity
                      return Compose.makeRecord({
                        Discount: r.values.Discount,
                        Description: r.values.Description,
                        ListPrice: r.values.ListPrice,
                        PricebookEntryId: r.values.PricebookEntryId,
                        ProductId: r.values.ProductId,
                        ProductCode: r.values.ProductCode,
                        Quantity: r.values.Quantity,
                        UnitPrice: r.values.UnitPrice,
                        Subtotal: r.values.Subtotal,
                        TotalPrice: r.values.TotalPrice,
                        QuoteId: mySavedQuote.recordID
                      }, 'QuoteLineItem')
                        .then(async myQuoteLineItem => {
                          return await Compose.saveRecord(myQuoteLineItem)
                        })
                    })
                    // Notify current user
                    ComposeUI.success('The new quote has been created.')
                    // Go to the record
                    ComposeUI.gotoRecordEditor(mySavedQuote)
                  })
              })
          })
        })
  }
}
