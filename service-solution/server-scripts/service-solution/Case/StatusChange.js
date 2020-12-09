export default {
  label: 'Change case status',
  description: 'Changes status of case record if previous status is differs from current status',

  * triggers ({ after }) {
    yield after('update')
      .for('compose:record')
      .where('module', 'Case')
      .where('namespace', 'service-solution')
  },

  async exec ({ $record, $oldRecord }, { Compose }) {
    let currentStatus = $record.values.Status
    let previousStatus = $oldRecord.values.Status

    // Check if there is no status. If so, the case is new and set it as new.
    if (!currentStatus) {
      currentStatus = 'New'
    }
    if (!previousStatus) {
      previousStatus = 'None'
    }

    // No update; no action needed
    if (currentStatus === previousStatus) {
      return $record
    }

    // Take note of the update
    const settings = await Compose.findLastRecord('Settings')
    const r = await Compose.makeRecord({
      CaseId: $record.recordID,
      Type: 'Status change',
      Subject: 'Status changed from ' + previousStatus + ' to ' + currentStatus,
      AccountId: $record.values.AccountId,
      ContactId: $record.values.ContactId,
      From: 'Automatic message',
      Department: settings.values.DefaultDepartment,
      TimeSpend: settings.values.DefaultTimeUpdate
    }, 'Update')
    return Compose.saveRecord(r)
  }
}
