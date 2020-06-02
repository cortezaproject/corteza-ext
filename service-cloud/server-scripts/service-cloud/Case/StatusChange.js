export default {
  label: 'Change case status',
  description: 'Changes status of case record if previous status is differs from current status',

  * triggers ({ after }) {
    yield after('update')
      .for('compose:record')
      .where('module', 'Case')
      .where('namespace', 'service-cloud')
  },

  async exec ({ $record, $oldRecord }, { Compose }) {
    // Get the current status of the case
    let currentStatus = $record.values.Status
    let previousStatus = $oldRecord.values.Status

    // Check if there is no status. If so, the case is new and set it as new.
    if (!currentStatus) {
      currentStatus = 'New'
    }
    if (!previousStatus) {
      previousStatus = 'None'
    }

    // Check if we need to insert a status change update
    if (currentStatus != previousStatus) {
      // Insert the status update
      // First, get the default settings
      return Compose.findLastRecord('Settings').then(async settings => {
        const defaultTimeSpend = settings.values.DefaultTimeUpdate
        const defaultDepartment = settings.values.DefaultDepartment

        // Make the update record
        return Compose.makeRecord({
          CaseId: $record.recordID,
          Type: 'Status change',
          Subject: 'Status changed from ' + previousStatus + ' to ' + currentStatus,
          AccountId: $record.values.AccountId,
          From: 'Automatic message',
          Department: defaultDepartment,
          TimeSpend: defaultTimeSpend,
        }, 'Update')
          .then(async myUpdate => {
            await Compose.saveRecord(myUpdate)
          })
      })
    }
  }
}
