import { procTemplate } from '../../../../lib/templates'

export default {
  name: 'TeplateLoad',
  label: 'Load selected template into email message',
  description: 'Loads selected email template into email message',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .where('module', 'EmailMessage')
      .where('namespace', 'service-solution')
      .uiProp('app', 'compose')
  },

  async exec ({ $record }, { Compose, ComposeUI }) {
    if (!$record.recordID) {
      ComposeUI.success('Please save the record before loading the template')
      return
    }

    if (!$record.values.EmailTemplateId) {
      return
    }

    let cse = { values: {} }
    if ($record.values.CaseId) {
      cse = await Compose.findRecordByID($record.values.CaseId, 'Case')
    }
    const contact = await Compose.findRecordByID($record.values.ContactId, 'Contact')
    const template = await Compose.findRecordByID($record.values.EmailTemplateId, 'EmailTemplate')

    const subject = procTemplate(template.values.Subject || '', { Case: cse.values, Contact: contact.values })
    const body = procTemplate(template.values.Body || '', { Case: $record.values, Contact: contact.values })

    $record.values.Subject = subject
    $record.values.HtmlBody = body
    await Compose.saveRecord($record)

    ComposeUI.success('The template has been loaded in to the email.')
    ComposeUI.gotoRecordEditor($record)
  }
}
