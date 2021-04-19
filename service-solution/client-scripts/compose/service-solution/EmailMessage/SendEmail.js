// SPDX-FileCopyrightText: 2020, Tomaž Jerman
// SPDX-License-Identifier: Apache-2.0

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

  async exec ({ $record }, { Compose, ComposeUI }) {
    const contact = await Compose.findRecordByID($record.values.ContactId, 'Contact')

    await Compose.sendMail(
      contact.values.Email,
      $record.values.Subject,
      { html: $record.values.HtmlBody }
    )
    ComposeUI.success(`The email "${$record.values.Subject}" has been sent to "${contact.values.RecordLabel}: ${contact.values.Email}".`)

    $record.values.Status = 'Sent'
    $record.values.ToAddress = contact.values.Email
    $record.values.MessageDate = (new Date()).toISOString()
    await Compose.saveRecord($record)

    // Log an update
    if ($record.values.CaseId) {
      const settings = await Compose.findLastRecord('Settings')
      await Compose.saveRecord(Compose.makeRecord({
        CaseId: $record.values.CaseId,
        Type: 'Outgoing email',
        Subject: 'Email: ' + $record.values.Subject,
        ContactId: $record.values.ContactId,
        From: 'Service Cloud',
        To: contact.values.Email,
        Content: $record.values.HtmlBody,
        Department: settings.values.DefaultDepartment,
        TimeSpend: settings.values.DefaultTimeUpdate
      }, 'Update'))
    }

    ComposeUI.gotoRecordViewer($record)
  }
}
