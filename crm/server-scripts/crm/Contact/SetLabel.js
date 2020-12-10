export default {
  label: 'Set label for Contact',
  description: 'Set label for contact record',

  * triggers ({ before }) {
    yield before('create', 'update')
      .for('compose:record')
      .where('module', 'Contact')
      .where('namespace', 'crm')
  },

  async exec ({ $record }, { Compose }) {
    let recordLabel = `${$record.values.FirstName || ''} ${$record.values.LastName || ''}`.trim()

    // Include the related account if present
    if ($record.values.AccountId) {
      const accountRecord = await Compose.findRecordByID($record.values.AccountId, 'Account')
      if ((accountRecord || { values: {} }).values.AccountName) {
        // Add to the record label
        recordLabel = recordLabel + ` (${accountRecord.values.AccountName})`
      }
      $record.values.RecordLabel = recordLabel
    }

    return $record
  }
}
