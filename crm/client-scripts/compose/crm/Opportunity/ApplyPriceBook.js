// SPDX-FileCopyrightText: 2020, Jože Fortun, Tomaž Jerman, Denis Arh 
// SPDX-License-Identifier: Apache-2.0


export default {
  label: 'Apply Price Book',
  description: 'Update prices of Products by applying the selected Price Book and inserted discounts',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .where('module', 'Opportunity')
      .where('namespace', 'crm')
      .uiProp('app', 'compose')
  },

  async exec ({ $record }, { Compose, ComposeUI }) {
    let pricebookId = $record.values.PricebookId

    // Default to a standard pricebook
    if (!pricebookId) {
      const sPricebook = await Compose.findRecords('IsActive = 1', 'Pricebook')
        .then(({ set: pp }) => {
          if (pp.length === 0) {
            ComposeUI.warning('There are no active price books configured in the CRM. Please insert an active price book in the Price book module.')
            return
          }

          return pp.find(({ values }) => values.IsStandard)
        })

      if (sPricebook) {
        pricebookId = sPricebook.recordID
        $record.values.PricebookId = pricebookId
        await Compose.saveRecord($record)
      }
    }

    if (!pricebookId) {
      ComposeUI.warning('Please select a Price book for this opportunity first.')
      return
    }

    // Process line items
    const lineItems = await Compose.findRecords({ filter: `OpportunityId = ${$record.recordID}`, limit: 0 }, 'OpportunityLineItem')
      .then(({ set: lineItems }) => lineItems)

    let quoteTotal = 0
    for (const lineItem of lineItems) {
      const product = await Compose.findRecordByID(lineItem.values.ProductId, 'Product')
      const pricebookEntry = await Compose.findRecords(`PricebookId = ${pricebookId} AND ProductId = ${lineItem.values.ProductId}`, 'PricebookEntry')
        .then(({ set: pp }) => pp.reverse().pop())

      if (!pricebookEntry) {
        continue
      }

      // Prepare base params
      const quantity = parseFloat(lineItem.values.Quantity || 1)
      const discount = parseFloat(lineItem.values.Discount || 0)
      const listprice = parseFloat(pricebookEntry.values.UnitPrice || 0)
      let unitprice = parseFloat(lineItem.values.UnitPrice || 0)
      if (!lineItem.values.UnitPrice || isNaN(lineItem.values.UnitPrice)) {
        // Use as default only when unit price is omitted
        unitprice = listprice
      }

      // Calculate costs
      const subtotal = unitprice * quantity
      const totalprice = subtotal - discount

      // Update it in the listitem record
      lineItem.values.Name = product.values.Name
      lineItem.values.ProductCode = product.values.ProductCode
      lineItem.values.ListPrice = listprice
      lineItem.values.UnitPrice = unitprice
      lineItem.values.Subtotal = subtotal
      lineItem.values.TotalPrice = totalprice
      quoteTotal += totalprice

      // Update the line item
      await Compose.saveRecord(lineItem)
    }

    // Update the quote
    $record.values.Amount = quoteTotal
    await Compose.saveRecord($record)

    ComposeUI.success('Pricebook applied')
    setTimeout(() => {
      location.reload()
    }, 1000)
  }
}
