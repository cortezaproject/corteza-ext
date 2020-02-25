export default {
  label: 'Set values for account',
  description: 'On Account record, sets the value of AccountSelect to the value of AccountName',

  * triggers ({ before }) {
    yield before('create', 'update')
      .for('compose:record')
      .where('module', 'Account')
      .where('namespace', 'service-cloud')
  },

  async exec ({ $record }) {
    $record.values.AccountSelect = $record.values.AccountName
    return $record
  }
}
