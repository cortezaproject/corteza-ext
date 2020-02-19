export default {
  name: 'Approve',
  label: 'Approve quote',
  description: 'Approves quote record and informs the user who created it',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .where('module', 'Quote')
      .where('namespace', 'crm')
  },

  async exec ({ $record, $page, $namespace }, { Compose, ComposeUI, System }) {
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
      // Send the mail
      await Compose.sendMail(
        user.email,
        `Quote "${$record.values.Name}" has been approved`,
        { html: `The following quote has been approved: <br><br><a href="https://latest.cortezaproject.org/compose/ns/${$namespace.slug}/pages/${$page.pageID}/record/${$record.recordID}/edit">${$record.values.Name}<a>` }
      )

      // Notify current user
      ComposeUI.success('The quote has been approved and the quote owner has been notified via email.')
    }).catch(({ message }) => {
      throw new Error(message)
    })
  }
}
