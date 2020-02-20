export default {
  name: 'SendToCustomEmail',
  label: 'Send to custom email',
  description: 'Sends quote email to custom address',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .where('module', 'Quote')
      .where('namespace', 'crm')
  },

  prompt (text, defaultText) {
    return window.prompt(text, defaultText)
  },

  async exec ({ $record }, { Compose, ComposeUI }) {
    // Get the to address
    const to = this.prompt('Please enter an email to send this quote to:')
    if (!to) {
      throw new Error('Please enter an email to send this quote to .')
    }

    let lineitems = ''
    Compose.findRecords(`QuoteId = ${$record.recordID}`, 'QuoteLineItem')
      .then(async ({ set }) => {
        set.forEach(lineitem => {
          lineitems = lineitems + 'Price:</strong> ' + lineitem.values.UnitPrice + '<br>'
          lineitems = lineitems + 'Quantity:</strong> ' + lineitem.values.Quantity + '<br>'
          lineitems = lineitems + 'Subtotal:</strong> ' + lineitem.values.Subtotal + '<br>'
          lineitems = lineitems + 'Discount:</strong> ' + lineitem.values.Discount + '<br>'
          lineitems = lineitems + 'Total Price:</strong> ' + lineitem.values.TotalPrice + '<br>'
          lineitems = lineitems + '-------------------------<br>'
        })

        // Get email body
        let html = '<h1>Details of Quote: ' + $record.values.QuoteNumber + ' - ' + $record.values.Name + '</h1>'
        html = html + '<br>'
        html = html + "<table border='1' cellpadding='1' cellspacing='1' style='min-width:100%;'>"
        html = html + '<tr>'
        html = html + '<td valign=top>'
        html = html + '<strong>Quote Information</strong><br>'
        html = html + '<br>'
        html = html + '<strong>Quote Number:</strong> ' + $record.values.QuoteNumber + '<br>'
        html = html + '<strong>Quote Name:</strong> ' + $record.values.Name + '<br>'
        html = html + '<strong>Expiration Date:</strong> ' + $record.values.ExpirationDate + '<strong><br>'
        html = html + '<strong>Description:</strong> ' + $record.values.Description
        html = html + '</td>'
        html = html + '<td valign=top>'
        html = html + '<strong>Primary contact data</strong><br>'
        html = html + '<br>'
        html = html + '<strong>Contact Name:</strong> ' + $record.values.ContactId + '<br>'
        html = html + '<strong>Email:</strong> ' + $record.values.Email + '<br>'
        html = html + '<strong>Phone:</strong> ' + $record.values.Phone
        html = html + '</td>'
        html = html + '<td valign=top>'
        html = html + '<strong>Totals</strong><br>'
        html = html + '<br>'
        html = html + '<strong>Subtotal:</strong> ' + $record.values.Subtotal + '<br>'
        html = html + '<strong>Additional Discount:</strong> ' + $record.values.Discount + '<br>'
        html = html + '<strong>Shipping and Handling:</strong> ' + $record.values.ShippingHandling + '<br>'
        html = html + '<strong>Total Price:</strong> ' + $record.values.TotalPrice + '<br>'
        html = html + '<strong>Tax:</strong> ' + $record.values.Tax + '<br>'
        html = html + '<strong>Grand Total:</strong> ' + $record.values.GrandTotal
        html = html + '</td>'
        html = html + '</tr>'
        html = html + '<tr>'
        html = html + "<td colspan='3'>"
        html = html + '<strong>Products</strong><br>'
        html = html + '<br>'
        html = html + lineitems
        html = html + '</td>'
        html = html + '</tr>'
        html = html + '<tr>'
        html = html + '<td valign=top>'
        html = html + '<strong>Bill To</strong><br>'
        html = html + '<br>'
        html = html + '<strong>Bill to Name:</strong> ' + $record.values.BillingName + '<br>'
        html = html + '<strong>Bill to Street:</strong> ' + $record.values.BillingStreet + '<br>'
        html = html + '<strong>Bill to City:</strong> ' + $record.values.BillingCity + '<br>'
        html = html + '<strong>Bill to State:</strong> ' + $record.values.BillingState + '<strong><br>'
        html = html + '<strong>Bill to Postal Code:</strong> ' + $record.values.BillingPostalCode + '<br>'
        html = html + '<strong>Bill to Country:</strong> ' + $record.values.BillingCountry
        html = html + '</td>'
        html = html + '<td valign=top>'
        html = html + '<strong>Quote To</strong><br>'
        html = html + '<br>'
        html = html + '<strong>Quote to Name:</strong> ' + $record.values.QuoteToName + '<br>'
        html = html + '<strong>Quote to Street:</strong> ' + $record.values.QuoteToStreet + '<br>'
        html = html + '<strong>Quote to City:</strong> ' + $record.values.QuoteToCity + '<br>'
        html = html + '<strong>Quote to State:</strong> ' + $record.values.QuoteToState + '<strong><br>'
        html = html + '<strong>Quote to Postal Code:</strong> ' + $record.values.QuoteToPostalCode + '<br>'
        html = html + '<strong>Quote to Country:</strong> ' + $record.values.QuoteToCountry
        html = html + '</td>'
        html = html + '<td valign=top>'
        html = html + '<strong>Ship To</strong><br>'
        html = html + '<br>'
        html = html + '<strong>Ship to Name:</strong> ' + $record.values.ShippingName + '<br>'
        html = html + '<strong>Ship to Street:</strong> ' + $record.values.ShippingStreet + '<br>'
        html = html + '<strong>Ship to City:</strong> ' + $record.values.ShippingCity + '<br>'
        html = html + '<strong>Ship to State:</strong> ' + $record.values.ShippingState + '<strong><br>'
        html = html + '<strong>Ship to Postal Code:</strong> ' + $record.values.ShippingPostalCode + '<br>'
        html = html + '<strong>Ship to Country:</strong> ' + $record.values.ShippingCountry
        html = html + '</td>'
        html = html + '</tr>'
        html = html + '</table>'

        // Send the email
        await Compose.sendMail(to, `Corteza - Quote: ${$record.values.QuoteNumber} - ${$record.values.Name}`, { html: html })
        ComposeUI.success('The quote has been sent via email.')
      })
  }
}
