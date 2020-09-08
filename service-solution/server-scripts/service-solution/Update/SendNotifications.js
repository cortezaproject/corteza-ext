export default {
  label: 'Insert update number',
  description: 'Sends notification about case update',

  * triggers ({ before }) {
    yield before('create', 'update')
      .for('compose:record')
      .where('module', 'Update')
      .where('namespace', 'service-solution')
  },

  async exec ({ $record }, { Compose, Messaging }) {
    // Check if the type is NOT an incoming email. If it's not, handle it as an internal update and send notifications
    if ($record.values.Type !== 'Incoming email') {
      // Set the notifications values to "1" (sent)
      if ($record.values.SendToMailingList) {
        $record.values.NotificationCaseMailingList = 1
      }
      $record.values.NotificationCaseCreator = 1

      // Find the related case
      return Compose.findRecordByID($record.values.CaseId, 'Case').then(caseRecord => {
        // Create the update text to send out via email.
        // Only when the Update record has a subject or type.
        if (($record.values.Subject) || ($record.values.Type)) {
          let html = 'Hi,'
          html += '<br>'
          html += '<br>'
          html += 'The following case has been updated:'
          html += '<br>'
          html += '<ul>'
          html += '<li><strong>Case ID:</strong> ' + caseRecord.values.Number + '</li>'
          html += '<li><strong>Subject:</strong> ' + caseRecord.values.Subject + '</li>'
          html += '<li><strong>Type:</strong> ' + caseRecord.values.Category + '</li>'
          html += '<li><strong>Status:</strong> ' + caseRecord.values.Status + '</li>'
          html += '<li><strong>Priority:</strong> ' + caseRecord.values.Priority + '</li>'
          html += '</ul>'
          html += '<br>'
          html += 'Update:'
          html += '<br>'
          html += '<ul>'
          html += '<li><strong>Type:</strong> ' + $record.values.Type + '</li>'
          html += '<li><strong>Subject:</strong> ' + $record.values.Subject + '</li>'
          html += '<li><strong>Content:</strong> ' + $record.values.Content + '</li>'
          html += '</ul>'
          html += '<br>'
          html += 'Kind regards,'
          html += '<br>'
          html += '<br>'
          html += 'Service Cloud'
          html += '<br>'
          html += '<br>'
          html += '--'
          html += '<br>'
          html += 'Ticket Summary:'
          html += '<hr>'
          html += caseRecord.values.Description

          return Compose.findLastRecord('Settings').then(async settings => {
            const defaultChannel = settings.values.DefaultSupportChannel
            const defaultCaseRecordLink = settings.values.DefaultCaseRecordLink

            // Get default settings to find if there is a channel to inform
            if (defaultChannel && defaultCaseRecordLink) {
              await Messaging.sendMessage('Automatic update. "' + caseRecord.values.Number + '" has been updated: ' + $record.values.Subject + ' (type: ' + $record.values.Type + '). Direct link: ' + defaultCaseRecordLink + '/' + caseRecord.recordID, defaultChannel)
            }
            // Get the contact of the case record to infor via email
            if (caseRecord.values.ContactId) {
              await Compose.findRecordByID(caseRecord.values.ContactId, 'Contact').then(async contactRecord => {
                // Check if the contact has an email address
                if (contactRecord.values.Email) {
                  // Send the update text
                  await Compose.sendMail(contactRecord.values.Email, '[' + caseRecord.values.Number + '] Update: ' + caseRecord.values.Subject, { html: html })
                }
              })
            }
            return $record
          })
        }
      })
    }
  }
}
