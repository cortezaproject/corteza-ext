export default {
  label: 'Insert update number',
  description: 'Sends notification about case update',

  * triggers ({ before }) {
    yield before('create', 'update')
      .for('compose:record')
      .where('module', 'Update')
      .where('namespace', 'service-solution')
  },

  // Just so we don't have this in the exec function
  prepareBody (cse, $record) {
    return `
Hi,
<br>
<br>
The following case has been updated:
<br>
<ul>
  <li><strong>Case ID:</strong> ${cse.values.Number}</li>
  <li><strong>Subject:</strong> ${cse.values.Subject}</li>
  <li><strong>Type:</strong> ${cse.values.Type}</li>
  <li><strong>Status:</strong> ${cse.values.Status}</li>
  <li><strong>Priority:</strong> ${cse.values.Priority}</li>
</ul>
<br>
Update:
<br>
<ul>
  <li><strong>Type:</strong> ${$record.values.Type}</li>
  <li><strong>Subject:</strong> ${$record.values.Subject}</li>
  <li><strong>Content:</strong> ${$record.values.Content}</li>
</ul>
<br>
Kind regards,
<br>
<br>
Service Cloud
<br>
<br>
--
<br>
Ticket Summary:
<hr>
${cse.values.Description}
`
  },

  async exec ({ $record }, { Compose, Messaging }) {
    // When not an internal email, handle it as an internal update and send notifications
    if ($record.values.Type === 'Incoming email') {
      return $record
    }

    // Set some flags
    if ($record.values.SendToMailingList) {
      $record.values.NotificationCaseMailingList = 1
    }
    $record.values.NotificationCaseCreator = 1

    // Don't send emails when no subject or type
    if (!$record.values.Subject && !$record.values.Type) {
      return $record
    }

    // Get related case
    const cse = await Compose.findRecordByID($record.values.CaseId, 'Case')
    const settings = await Compose.findLastRecord('Settings')

    // Send a message to the messaging channel
    if (settings.values.DefaultSupportChannel && settings.values.DefaultCaseRecordLink) {
      await Messaging.sendMessage('Automatic update. "' + cse.values.Number + '" has been updated: ' + $record.values.Subject + ' (type: ' + $record.values.Type + '). Direct link: ' + settings.values.DefaultCaseRecordLink + '/' + cse.recordID, settings.values.DefaultSupportChannel)
    }

    // Send an email to the contact
    if (cse.values.ContactId) {
      const contact = await Compose.findRecordByID(cse.values.ContactId, 'Contact')
      if (contact.values.Email) {
        // Send the update text
        await Compose.sendMail(
          contact.values.Email,
          '[' + cse.values.Number + '] Update: ' + cse.values.Subject,
          { html: this.prepareBody(cse, $record) }
        )
      }
    }

    return $record
  }
}
