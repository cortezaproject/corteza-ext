// SPDX-FileCopyrightText: 2020, Jože Fortun, Tomaž Jerman, Denis Arh 
// SPDX-License-Identifier: Apache-2.0

export default {
  label: 'Set Case status to Working',
  description: 'Sets status of case to "Working"',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .where('module', 'Case')
      .where('namespace', 'crm')
      .uiProp('app', 'compose')
  },

  async exec ({ $record }, { Compose }) {
    $record.values.Status = 'Working'
    await Compose.saveRecord($record)

    // Create an update
    return Compose.saveRecord(Compose.makeRecord({
      CaseId: $record.recordID,
      Description: 'State set to "Working"',
      Type: 'State change'
    }, 'CaseUpdate'))
  }
}
