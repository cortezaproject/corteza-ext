export default {
  name: 'StatusChange',
  label: 'Change case status',
  description: 'Changes status of case record if previous status is differs from current status',

  * triggers ({ before }) {
    yield before('update')
      .for('compose:record')
      .where('module', 'Case')
      .where('namespace', 'service-cloud')
  },

  async exec ({ $record }, { Compose }) {
    // Get the current status of the case
    let currentStatus = $record.values.Status
    let previousStatus = $record.values.PreviousStatus

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
        let defaultCost = settings.values.DefaultCostPerHour
        const defaultDepartment = settings.values.DefaultDepartment

        // Get the record from the department
        const departmentRecord = await Compose.findRecordByID(defaultDepartment, 'Department')
        // Get the cost associated to the department
        if (departmentRecord.values.HourCost) {
          defaultCost = departmentRecord.values.HourCost
        }

        // calculat the total cost
        const totalCost = parseFloat(defaultCost) * parseFloat(defaultTimeSpend)

        // Make the update record
        return Compose.makeRecord({
          CaseId: $record.recordID,
          Type: 'Status change',
          Subject: 'Status changed from ' + previousStatus + ' to ' + currentStatus,
          AccountId: $record.values.AccountId,
          From: 'Automatic message',
          Department: defaultDepartment,
          TimeSpend: defaultTimeSpend,
          Cost: totalCost
        }, 'Update')
          .then(async myUpdate => {
            await Compose.saveRecord(myUpdate)
            // Calculate and store the total price of the ticket
            let totalCost = $record.values.TotalCost
            if (!totalCost || totalCost === '' || isNaN(totalCost)) {
              totalCost = 0
            }

            let totalTime = $record.values.TotalTime
            if (!totalTime || totalTime === '' || isNaN(totalTime)) {
              totalTime = 0
            }

            // Update the total time and cost in the ticket
            $record.values.TotalCost = parseFloat(totalCost) + (parseFloat(defaultCost) * parseFloat(defaultTimeSpend))
            $record.values.TotalTime = parseFloat(totalTime) + parseFloat(defaultTimeSpend)

            // Store the new state in the previous state field
            $record.values.PreviousStatus = currentStatus
            return $record
          })
      })
    }
  }
}
