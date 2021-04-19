// SPDX-FileCopyrightText: 2020, Tomaž Jerman
// SPDX-License-Identifier: Apache-2.0

export default {
  label: 'Add Update to this Case',
  description: 'Create update record in CaseUpdate module',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .where('module', 'Case')
      .where('namespace', 'service-solution')
      .uiProp('app', 'compose')
  },

  async exec ({ $record }, { Compose, ComposeUI }) {
    const settings = await Compose.findLastRecord('Settings')

    const department = settings.values.DefaultDepartment
    const timeSpend = settings.values.DefaultTimeUpdate

    const update = await Compose.saveRecord(Compose.makeRecord({
      CaseId: $record.recordID,
      AccountId: $record.values.AccountId,
      ContactId: $record.values.ContactId,
      Department: department,
      TimeSpend: timeSpend
    }, 'Update'))

    ComposeUI.gotoRecordEditor(update)
    return update
  }
}
