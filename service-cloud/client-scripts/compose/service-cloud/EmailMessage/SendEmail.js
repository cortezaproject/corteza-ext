export default {
  name: 'SendEmail',
  label: 'Send Email',
  description: 'Sends provided email message',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .where('module', 'EmailMessage')
      .where('namespace', 'service-cloud')
  },

  getTimestamp () {
    const m = new Date()
    return m.toISOString()
  },

  async exec ({ $record }, { Compose, ComposeUI }) {
    return Compose.findRecordByID($record.values.ContactId, 'Contact')
      .then(async contactRecord => {
        await Compose.sendMail(contactRecord.values.Email, $record.values.Subject, { html: $record.values.HtmlBody })
        ComposeUI.success(`The email "${$record.values.Subject}" has been sent to "${contactRecord.values.RecordLabel}: ${contactRecord.values.Email}".`)

        $record.values.Status = 'Sent'
        $record.values.ToAddress = contactRecord.values.Email

        $record.values.MessageDate = this.getTimestamp()
        const mySavedRecord = await Compose.saveRecord($record)
        ComposeUI.gotoRecordViewer(mySavedRecord)
        // Add the email as an update
        if ($record.values.CaseId) {
          // First, get the default settings
          Compose.findLastRecord('Settings').then(async settings => {
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
                CaseId: $record.values.CaseId,
                Type: 'Outgoing email',
                Subject: 'Email: ' + $record.values.Subject,
                ContactId: $record.values.ContactId,
                From: 'Service Cloud',
                To: contactRecord.values.Email,
                Content: $record.values.HtmlBody,
                Department: defaultDepartment,
                TimeSpend: defaultTimeSpend,
                Cost: totalCost
              }, 'CaseUpdate')
                .then(async myUpdate => {
                  await Compose.saveRecord(myUpdate)
                })
            })
          }
      })
  }
}
