// SPDX-FileCopyrightText: 2020, Jože Fortun, Tomaž Jerman 
// SPDX-License-Identifier: Apache-2.0


export default {
  label: 'Insert case number',
  description: 'Sets case number to next case number in settings',

  * triggers ({ before }) {
    yield before('create')
      .for('compose:record')
      .where('module', 'Case')
      .where('namespace', 'crm')
  },

  async exec ({ $record }, { Compose }) {
    const settings = await Compose.findLastRecord('Settings')

    // Map the case number
    let nextCaseNumber = settings.values.CaseNextNumber
    if (!nextCaseNumber || isNaN(nextCaseNumber)) {
      nextCaseNumber = 0
    }

    $record.values.CaseNumber = ('' + nextCaseNumber).padStart(8, '0')
    settings.values.CaseNextNumber = parseInt(nextCaseNumber, 10) + 1
    await Compose.saveRecord(settings)

    return $record
  }
}
