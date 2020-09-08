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
    if (!$record.recordID) {
      ComposeUI.success('Please save the record before loading the template')
      return true
    }

    // Check if there is a template
    const templateId = $record.values.EmailTemplateId

    if (templateId) {
      // Get the template
      return Compose.findRecordByID(templateId, 'EmailTemplate').then(templateRecord => {
        let subject = templateRecord.values.Subject
        let body = templateRecord.values.Body

        // Find the contact (there will always be a contact)
        Compose.findRecordByID($record.values.ContactId, 'Contact').then(async contactRecord => {
          subject = this.procTemplate(subject, { Contact: contactRecord.values })
          body = this.procTemplate(body, { Contact: contactRecord.values })
          // Get all the possible placeholders for the case, if there is a case selected
          if ($record.values.CaseId) {
            const caseRecord = await Compose.findRecordByID($record.values.CaseId, 'Case')
            subject = this.procTemplate(subject, { Case: caseRecord.values })
            body = this.procTemplate(body, { Case: caseRecord.values })
          }
          $record.values.Subject = subject
          $record.values.HtmlBody = body

          // Save the record
          const mySavedRecord = await Compose.saveRecord($record)
          ComposeUI.success('The template has been loaded in to the email.')
          ComposeUI.gotoRecordEditor(mySavedRecord)
        }).catch(({ message }) => {
          ComposeUI.warning('The template could not be loaded.')
          throw new Error(message)
        })
      }).catch(({ message }) => {
        throw new Error(message)
      })
    }
  }
}
