export default {
  name: 'UpdateTotalPrice',
  label: 'Update total price',
  description: 'Updatese total price of quote',

  * triggers ({ before }) {
    yield before('update')
      .for('compose:record')
      .where('module', 'Quote')
      .where('namespace', 'crm')
  },

  async exec ({ $record }) {
    // Get the subtotal
    const subtotal = parseFloat($record.values.Subtotal)

    // Apply additional quote discount
    let discount = $record.values.Discount
    if (!discount || discount === '' || isNaN(discount)) {
      discount = 0
    }
    let totalPrice = subtotal - parseFloat(discount)

    // Calculate if it's not below 0
    if (totalPrice < 0) {
      totalPrice = 0
    }

    // Apply shipping
    let shippingHandling = $record.values.ShippingHandling
    if (!shippingHandling || shippingHandling === '' || isNaN(shippingHandling)) {
      shippingHandling = 0
    }
    totalPrice = totalPrice + parseFloat(shippingHandling)

    // Add totalPrice to the record
    $record.values.TotalPrice = totalPrice

    // Apply taxes
    const tax = $record.values.Tax
    if (!shippingHandling || shippingHandling === '' || isNaN(shippingHandling)) {
      // No tax, so don't do anything
      $record.values.GrandTotal = totalPrice
    } else {
      if (tax > 0) {
        // Apply tax
        const taxpercent = parseFloat(tax / 100)
        $record.values.GrandTotal = totalPrice * (1 + taxpercent)
      }
    }

    return $record
  }
}
