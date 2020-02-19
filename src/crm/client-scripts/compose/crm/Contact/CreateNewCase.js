export default {
  name: 'CreateNewCase',
  label: 'Creates new case from contact',
  description: 'Creates new case from and existing contact',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .where('module', 'Contact')
      .where('namespace', 'crm')
  },

  async exec ({ $record }, { Compose, ComposeUI }) {
    // Get the default settings
    return Compose.findLastRecord('Settings').then(settings => {
      // Map the case number
      let nextCaseNumber = settings.values.CaseNextNumber
      if (typeof nextCaseNumber === 'undefined' || nextCaseNumber === '' || isNaN(nextCaseNumber)) {
        nextCaseNumber = 0
      }

      return Compose.makeRecord({
        OwnerId: $record.values.OwnerId,
        Subject: '(no subject)',
        ContactId: $record.recordID,
        AccountId: $record.values.AccountId,
        Status: 'New',
        Priority: 'Low',
        SuppliedName: $record.values.FirstName + ' ' + $record.values.LastName,
        SuppliedEmail: $record.values.Email,
        SuppliedPhone: $record.values.Phone,
        CaseNumber: nextCaseNumber
      }, 'Case').then(async myCase => {
        const mySavedCase = await Compose.saveRecord(myCase)
        const nextCaseNumberUpdated = parseInt(nextCaseNumber, 10) + 1

        // Update the config
        settings.values.CaseNextNumber = nextCaseNumberUpdated
        const mySavedSettings = await Compose.saveRecord(settings)
        console.log('Record saved, new ID', mySavedSettings.recordID)

        // Notify current user
        ComposeUI.success('The new case has been created.')

        // Go to the record
        ComposeUI.gotoRecordEditor(mySavedCase)
        return mySavedCase
      })
    }).catch(({ message }) => {
      throw new Error(message)
    })
  }
}
