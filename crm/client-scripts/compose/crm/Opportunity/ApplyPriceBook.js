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
    // Get the current price book
    let pricebookId = $record.values.PricebookId

    // Check if there is a price book. If there isn't one, find the standard one
    if (!pricebookId) {
      // If there is no price book selected, get the default price book.
      const { set } = await Compose.findRecords('IsActive = 1', 'Pricebook')
        .catch(() => ({ set: [] }))
      if (set.length === 0) {
        // return that there are no Price books in the CRM
        ComposeUI.warning('There are no active price books configured in the CRM. Please insert an active price book in the Price book module.')
      } else {
        // Loop through the price books, to find the standard one
        set.forEach(r => {
          // Check if the price book is the standard one
          if (r.values.IsStandard === '1') {
            // Get the price book id
            pricebookId = r.recordID
          }
        })

        if (pricebookId) {
          // Save the price book in the opportunity
          $record.values.PricebookId = pricebookId

          // Save the price book in the opportunity
          await Compose.saveRecord($record)
        }
      }
    }

    // Check if a price book is selected or if a standard price book has been found. If not, exit.
    if (!pricebookId) {
      ComposeUI.warning('Please select a Price book for this opportunity first.')
      return
    }

    // Set the total amount of the opportunity
    let amount = 0

    // Find all opportunity lineitems
    return Compose.findRecords(`OpportunityId = ${$record.recordID}`, 'OpportunityLineItem')
      .catch(() => ({ set: [] }))
      .then(({ set }) => {
        set.forEach(async lineitem => {
          // Set the default values
          let quantity = lineitem.values.Quantity
          const discount = lineitem.values.Discount
          let listprice = 0
          let unitprice = 0
          let subtotal = 0
          let totalprice = 0

          // Get the product
          const product = await Compose.findRecordByID(lineitem.values.ProductId, 'Product')
          // Set the product name and code
          lineitem.values.Name = product.values.Name
          lineitem.values.ProductCode = product.values.ProductCode
          // Get the right price from the selected price book
          return Compose.findRecords(`PricebookId = ${pricebookId} AND ProductId = ${lineitem.values.ProductId}`, 'PricebookEntry')
            .catch(() => ({ set: [] }))
            .then(async ({ set }) => {
              if (set.length > 0) {
                const pricebookEntry = set[0]

                // Get the list price
                listprice = pricebookEntry.values.UnitPrice

                // Update unitprice only when the value is empty
                unitprice = lineitem.values.UnitPrice
                if (!unitprice || unitprice === '' || isNaN(unitprice)) {
                  unitprice = listprice
                }

                // Calculate the totals
                if (!quantity || quantity === '' || isNaN(quantity)) {
                  quantity = 0
                }
                subtotal = unitprice * quantity

                // Calculate the total
                if (!discount || discount === '' || isNaN(discount)) {
                  totalprice = subtotal
                } else {
                  totalprice = subtotal - discount
                }

                // Update it in the listitem record
                lineitem.values.ListPrice = listprice
                lineitem.values.UnitPrice = unitprice
                lineitem.values.Subtotal = subtotal
                lineitem.values.TotalPrice = totalprice

                // Add the total price to the amount of the opportunity
                amount = amount + totalprice
                console.log('savee')
                // Save the lineitem
                await Compose.saveRecord(lineitem)

                // Save the opportunity record
                $record.values.Amount = amount

                const newRecord = await Compose.saveRecord($record)
                if (newRecord) {
                  ComposeUI.gotoRecordViewer(newRecord)
                  ComposeUI.success('Pricebook applied') 
                  return newRecord
                } else {
                  ComposeUI.warning('Pricebook failed to apply') 
                  return $record
                }
              }
            })
        })
      })
  }
}
