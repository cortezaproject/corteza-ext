export default {
  label: 'Approve this Quote',
  description: 'Approves quote record and informs the user who created it',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .where('module', 'Quote')
      .where('namespace', 'crm')
      .uiProp('app', 'compose')
  },

  async exec ({ $record }, { Compose, ComposeUI, System, frontendBaseURL }) {
    // Check if the quote has the correct status
    if ($record.values.Status !== 'In Review') {
      // Inform
      ComposeUI.warning('A quote needs to have the status In Review in order to be approved.')
      return
    }

    // Change value
    $record.values.Status = 'Approved'

    await Compose.saveRecord($record)
    // Get the email of the owner
    return System.findUserByID($record.createdBy).then(async user => {
      const recordPage = await ComposeUI.getRecordPage($record)
      // Send the mail
      await Compose.sendMail(
        user.email,
        `Quote "${$record.values.Name}" has been approved`,
        { html: `The following quote has been approved: <br><br><a href="${frontendBaseURL}/compose/ns/crm/pages/${recordPage.pageID}/record/${$record.recordID}/edit">${$record.values.Name}<a>` }
      )

      // Notify current user
      ComposeUI.success('The quote has been approved and the quote owner has been notified via email.')
    })
  }
}
