import { procTemplate } from '../../../../lib/templates'

export default {
  label: 'Create email for this Case',
  description: 'Creates Email message record in module EmailMessage',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .where('module', 'Case')
      .where('namespace', 'service-solution')
      .uiProp('app', 'compose')
  },

  async exec ({ $record }, { Compose, ComposeUI }) {
    const settings = await Compose.findLastRecord('Settings')

    if (!settings.values.DefaultCaseEmailTemplate) {
      return $record
    }

    // There will always be a contact
    const contact = await Compose.findRecordByID($record.values.ContactId, 'Contact')

    const template = await Compose.findRecordByID(settings.values.DefaultCaseEmailTemplate, 'EmailTemplate')
    const subject = procTemplate(template.values.Subject || '', { Case: $record.values, Contact: contact.values })
    const body = procTemplate(template.values.Body || '', { Case: $record.values, Contact: contact.values })

    // Create the email
    const email = await Compose.saveRecord(Compose.makeRecord({
      Subject: subject,
      HtmlBody: body,
      Status: 'Draft',
      EmailTemplateId: settings.values.DefaultCaseEmailTemplate,
      CaseId: $record.recordID,
      ContactId: $record.values.ContactId
    }, 'EmailMessage'))

    ComposeUI.gotoRecordEditor(email)
    return email
  }
}
