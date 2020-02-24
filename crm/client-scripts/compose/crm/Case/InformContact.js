export default {
  name: 'InformContact',
  label: 'Inform the contact via email of the Case solution',
  description: 'Inform the contact via email of the Case solution',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .where('module', 'Case')
      .where('namespace', 'crm')
      .uiProp('app', 'compose')
  },

  async exec ({ $record }, { Compose, ComposeUI }) {
    // Check if the case is closed
    if ($record.values.Status === 'Closed') {
      // Get the to address
      const to = $record.values.SuppliedEmail
      if (!to) {
        ComposeUI.warning('There is no supplied email. Please fill in an email address in the supplied email field.')
        return
      }

      // Get email body
      let html = '<h1>Solution of case: ' + $record.values.CaseNumber + ' - ' + $record.values.Subject + '</h1>'
      html = html + '<br>'
      html = html + '<strong>Solution Title:</strong> ' + $record.values.SolutionName + '<br>'
      html = html + '<strong>Solution Details:</strong> ' + $record.values.SolutionNote

      // Send the email
      await Compose.sendMail(to, `Corteza - Quote: ${$record.values.QuoteNumber} - ${$record.values.Name}`, { html })
      ComposeUI.success('The case solution has been sent via email.')
      return true
    } else {
      ComposeUI.warning('You can only inform the client of a solution when the case status is "Closed".')
      return
    }
  }
}
