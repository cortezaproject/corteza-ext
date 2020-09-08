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
    // Get the default settings
    return Compose.findLastRecord('Settings').then(settings => {
      const department = settings.values.DefaultDepartment
      const timeSpend = settings.values.DefaultTimeUpdate

      // Create the related update
      return Compose.makeRecord({
        CaseId: $record.recordID,
        AccountId: $record.values.AccountId,
        ContactId: $record.values.ContactId,
        Department: department,
        TimeSpend: timeSpend
      }, 'Update')
        .then(async myUpdate => {
          const mySavedUpdate = await Compose.saveRecord(myUpdate)
          ComposeUI.gotoRecordEditor(mySavedUpdate)
          return mySavedUpdate
        })
    })
  }
}
