export default {
  label: 'Send email to the contact',
  description: 'Sends provided email message',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .where('module', 'EmailMessage')
      .where('namespace', 'service-solution')
      .uiProp('app', 'compose')
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
            const defaultDepartment = settings.values.DefaultDepartment

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
              }, 'Update')
                .then(async myUpdate => {
                  await Compose.saveRecord(myUpdate)
                })
            })
          }
      })
  }
}
