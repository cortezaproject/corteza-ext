export default {
  name: 'CreateEmail',
  label: 'Create Case Email',
  description: 'Creates Email message record in module EmailMessage',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .where('module', 'Case')
      .where('namespace', 'service-cloud')
      .uiProp('app', 'compose')
  },

  procTemplate (tpl, pairs = {}) {
    return tpl.replace(/{{\s*(.+?)\s*}}/g, (match) => {
      // remove {{, }} and extra spaces
      const token = match.substr(2, match.length - 4).trim().split('.', 2)

      // return the placeholder if we do not find the value
      const miss = '{{' + token.join('.') + '}}'

      if (token.length === 1) {
        // handle simpe key-value pairs
        return pairs[token] || miss
      } else {
        // handle complex key-key-value (ie: modulename: recordvalues)
        const [key, field] = token
        return pairs[key] && pairs[key][field] ? pairs[key][field] : miss
      }
    })
  },

  async exec ({ $record }, { Compose, ComposeUI }) {
    // Get the default template from the settings.
    return Compose.findLastRecord('Settings').then(settings => {
      const templateId = settings.values.DefaultCaseEmailTemplate

      if (templateId) {
        // Get the template
        Compose.findRecordByID(templateId, 'EmailTemplate').then(async templateRecord => {
          let subject = templateRecord.values.Subject
          let body = templateRecord.values.Body

          subject = this.procTemplate(subject, { Case: $record.values })
          body = this.procTemplate(body, { Case: $record.values })

          // Find the contact (there will always be a contact)
          const contactRecord = await Compose.findRecordByID($record.values.ContactId, 'Contact')
          subject = this.procTemplate(subject, { Contact: contactRecord.values })
          body = this.procTemplate(body, { Contact: contactRecord.values })
          // Create the email
          return Compose.makeRecord({
            Subject: subject,
            HtmlBody: body,
            Status: 'Draft',
            EmailTemplateId: templateId,
            CaseId: $record.recordID,
            ContactId: $record.values.ContactId
          }, 'EmailMessage')
            .then(async myEmailMessage => {
              const mySavedEmailMessage = await Compose.saveRecord(myEmailMessage)
              ComposeUI.gotoRecordEditor(mySavedEmailMessage)
              return mySavedEmailMessage
            })
        })
      }
      return
    }).catch(({ message }) => {
      throw new Error(message)
    })
  }
}
