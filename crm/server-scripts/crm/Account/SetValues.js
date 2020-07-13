export default {
  label: 'Set values for account',
  description: 'On Account record, sets the values on update',

  * triggers ({ before }) {
    yield before('create', 'update')
      .for('compose:record')
      .where('module', 'Account')
      .where('namespace', 'crm')
  },

  async exec ({ $record }, { Compose }) {
    const gen = async (Street, City, State, PostalCode, Country) => {
      if (Country) {
        const cr = await Compose.findRecordByID(Country, 'CountryList')
        Country = cr.values['Name']
      }
      return [Street, City, State, PostalCode, Country ].filter(a => a).join('\n').trim()
    }

    let { BillingStreet, BillingCity, BillingState, BillingPostalCode, BillingCountry } = $record.values
    $record.values.GeneratedBillingAddress = await gen(BillingStreet, BillingCity, BillingState, BillingPostalCode, BillingCountry)

    let { ShippingStreet, ShippingCity, ShippingState, ShippingPostalCode, ShippingCountry } = $record.values
    $record.values.GeneratedShippingAddress = await gen(ShippingStreet, ShippingCity, ShippingState, ShippingPostalCode, ShippingCountry)

    return $record
  }
}
