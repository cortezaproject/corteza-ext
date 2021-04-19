// SPDX-FileCopyrightText: 2020, Tomaž Jerman
// SPDX-License-Identifier: Apache-2.0

export default {
  label: 'Prepare case',
  description: 'Inserts some default values',

  * triggers ({ before }) {
    yield before('create')
      .for('compose:record')
      .where('module', 'Case')
      .where('namespace', 'service-solution')
  },

  async exec ({ $record }) {
    $record.values.Status = $record.values.Status || 'New'
    $record.values.PreviousStatus = $record.values.PreviousStatus || 'New'
    return $record
  }
}
