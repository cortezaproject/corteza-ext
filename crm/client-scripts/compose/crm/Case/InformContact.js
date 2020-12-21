export default {
  label: 'Inform the contact via email of the Case solution',
  description: 'Inform the contact via email of the Case solution',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .where('module', 'Case')
      .where('namespace', 'crm')
      .uiProp('app', 'compose')
  },

  // Just so we don't have this in the exec function
  prepareBody ($record) {
    return `
<h1>Solution of case: ${$record.values.CaseNumber} - ${$record.values.Subject}</h1>
<br>
<strong>Solution Title:</strong> ${$record.values.SolutionName || '/'}<br>
<strong>Solution Details:</strong> ${$record.values.SolutionNote || '/'}
`
  },

  async exec ({ $record }, { Compose, ComposeUI }) {
    if ($record.values.Status !== 'Closed') {
      ComposeUI.warning('You can only inform the client of a solution when the case status is "Closed".')
      return
    }

    if (!$record.values.SuppliedEmail) {
      ComposeUI.warning('There is no supplied email. Please fill in an email address in the supplied email field.')
      return
    }

    // Send the email
    await Compose.sendMail(
      $record.values.SuppliedEmail,
      `Corteza - Case: ${$record.values.CaseNumber} - ${$record.values.Subject}`,
      { html: this.prepareBody($record) }
    )
    ComposeUI.success('The case solution has been sent via email.')
  }
}
