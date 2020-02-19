export default {
  name: 'CreateNewCase',
  label: 'Creates new case from an account',
  description: 'Creates new record in Case module for the specified account',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .where('module', 'Account')
      .where('namespace', 'crm')
  },

  async exec ({ $record }, { Compose, ComposeUI }) {
    // Get the default settings
    return Compose.findLastRecord('Settings').then(settings => {
      // Map the case number
      let nextCaseNumber = settings.values.CaseNextNumber
      if (!nextCaseNumber || isNaN(nextCaseNumber)) {
        nextCaseNumber = 0
      }

      // Find the contact we want to link the new case to (by default, the primary contact)
      return Compose.findRecords(`AccountId = ${$record.recordID}`, 'Contact').then(({ set }) => {
          let ContactId, SuppliedName, SuppliedEmail, SuppliedPhone

          // Loop through the contacts of the account, to save the primary contact
          set.forEach(r => {
            // Check if it's the primary contact
            const contactIsPrimary = r.values.IsPrimary
            if (contactIsPrimary === '1') {
              // Add the contact
              ContactId = r.recordID
              SuppliedName = r.values.FirstName + ' ' + r.values.LastName
              SuppliedEmail = r.values.Email
              SuppliedPhone = r.values.Phone
            }
          })

        return Compose.makeRecord({
          OwnerId: $record.values.OwnerId,
          Subject: '(no subject)',
          ContactId: ContactId,
          AccountId: $record.recordID,
          Status: 'New',
          Priority: 'Low',
          SuppliedName: SuppliedName,
          SuppliedEmail: SuppliedEmail,
          SuppliedPhone: SuppliedPhone,
          CaseNumber: nextCaseNumber
        }, 'Case')
          .then(async myCase => {
            // Save new Case record
            const mySavedCase = await Compose.saveRecord(myCase)

            // Update the config
            const nextCaseNumberUpdated = parseInt(nextCaseNumber, 10) + 1
            settings.values.CaseNextNumber = nextCaseNumberUpdated
            await Compose.saveRecord(settings)

            // Notify current user
            ComposeUI.success('The new case has been created.')

            // Go to the record
            ComposeUI.gotoRecordEditor(mySavedCase)

            return mySavedCase
          })
      })
    })
  }
}
