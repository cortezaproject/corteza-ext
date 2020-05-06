export default {
  label: 'Set values for account',
  description: 'On Account record, sets the values on update',

  * triggers ({ before }) {
    yield before('update')
      .for('compose:record')
      .where('module', 'Account')
      .where('namespace', 'crm')
  },

  async exec ({ $record }) {
    const { Street, City, State, PostalCode, Country } = $record.values
    const generatedAddress = [Street, City, State, PostalCode, Country ].filter(a => a).join('\n')
    $record.values.GeneratedBillingAddress = generatedAddress
    $record.values.GeneratedShippingAddress = generatedAddress
    return $record
  }
}
