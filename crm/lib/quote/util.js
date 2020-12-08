export function quoteToHTML($record, lineItems) {
  return `
<h1>Details of Quote: ${$record.values.QuoteNumber} - ${$record.values.Name}</h1>
<br>
<table border="1" cellpadding="1" cellspacing="1" style="min-width:100%;">
  <tr>
    <td valign="top">
      <strong>Quote Information</strong>
      <br><br>
      <strong>Quote Number:</strong> ${$record.values.QuoteNumber}<br>
      <strong>Quote Name:</strong> ${$record.values.Name}<br>
      <strong>Expiration Date:</strong> ${$record.values.ExpirationDate}<strong><br>
      <strong>Description:</strong> ${$record.values.Descriptio}
    </td>
    <td valign="top">
      <strong>Primary contact data</strong>
      <br><br>
      <strong>Contact Name:</strong> ${$record.values.ContactId}<br>
      <strong>Email:</strong> ${$record.values.Email}<br>
      <strong>Phone:</strong> ${$record.values.Phon}
    </td>
    <td valign="top">
      <strong>Totals</strong><br>
      <br>
      <strong>Subtotal:</strong> ${$record.values.Subtotal}<br>
      <strong>Additional Discount:</strong> ${$record.values.Discount}<br>
      <strong>Shipping and Handling:</strong> ${$record.values.ShippingHandling}<br>
      <strong>Total Price:</strong> ${$record.values.TotalPrice}<br>
      <strong>Tax:</strong> ${$record.values.Tax}<br>
      <strong>Grand Total:</strong> ${$record.values.GrandTota}
    </td>
  </tr>
  <tr>
    <td colspan='3'>
      <strong>Products</strong>
      <br><br>
      ${lineItemsToHTML(lineItems)}
    </td>
  </tr>
  <tr>
    <td valign="top">
      <strong>Bill To</strong><br>
      <br>
      <strong>Bill to Name:</strong> ${$record.values.BillingName}<br>
      <strong>Bill to Street:</strong> ${$record.values.BillingStreet}<br>
      <strong>Bill to City:</strong> ${$record.values.BillingCity}<br>
      <strong>Bill to State:</strong> ${$record.values.BillingState}<strong><br>
      <strong>Bill to Postal Code:</strong> ${$record.values.BillingPostalCode}<br>
      <strong>Bill to Country:</strong> ${$record.values.BillingCountry}
    </td>
    <td valign="top">
      <strong>Quote To</strong><br>
      <br>
      <strong>Quote to Name:</strong> ${$record.values.QuoteToName}<br>
      <strong>Quote to Street:</strong> ${$record.values.QuoteToStreet}<br>
      <strong>Quote to City:</strong> ${$record.values.QuoteToCity}<br>
      <strong>Quote to State:</strong> ${$record.values.QuoteToState}<strong><br>
      <strong>Quote to Postal Code:</strong> ${$record.values.QuoteToPostalCode}<br>
      <strong>Quote to Country:</strong> ${$record.values.QuoteToCountry}
    </td>
    <td valign="top">
      <strong>Ship To</strong><br>
      <br>
      <strong>Ship to Name:</strong> ${$record.values.ShippingName}<br>
      <strong>Ship to Street:</strong> ${$record.values.ShippingStreet}<br>
      <strong>Ship to City:</strong> ${$record.values.ShippingCity}<br>
      <strong>Ship to State:</strong> ${$record.values.ShippingState}<strong><br>
      <strong>Ship to Postal Code:</strong> ${$record.values.ShippingPostalCode}<br>
      <strong>Ship to Country:</strong> ${$record.values.ShippingCountry}
    </td>
  </tr>
</table>
`
}

export function lineItemsToHTML(lineItems) {
  return lineItems.map(lineitem => `
<strong>Price:</strong> ${lineitem.values.UnitPrice}<br>
<strong>Quantity:</strong> ${lineitem.values.Quantity}<br>
<strong>Subtotal:</strong> ${lineitem.values.Subtotal}<br>
<strong>Discount:</strong> ${lineitem.values.Discount}<br>
<strong>Total Price:</strong> ${lineitem.values.TotalPrice}<br>`
  ).join('-------------------------<br>')
}
