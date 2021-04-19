// SPDX-FileCopyrightText: 2020, Tomaž Jerman
// SPDX-License-Identifier: Apache-2.0

export default {
  label: 'Set label for Contact',
  description: 'Set label for contact record',

  * triggers ({ before }) {
    yield before('create', 'update')
      .for('compose:record')
      .where('module', 'Contact')
      .where('namespace', 'service-solution')
  },

  async exec ({ $record }, { Compose }) {
    let recordLabel = `${$record.values.FirstName || ''} ${$record.values.LastName || ''}`.trim()

    // Include the related account if present
    if ($record.values.AccountId) {
      const account = await Compose.findRecordByID($record.values.AccountId, 'Account')
      if ((account || { values: {} }).values.AccountName) {
        recordLabel += ` (${account.values.AccountName})`
      }
    }

    $record.values.RecordLabel = recordLabel
    return $record
  }
}
