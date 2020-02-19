export default {
  name: 'SubmitForApproval',
  label: 'Submit quote for approval',
  description: 'Changes status of quote to In Review and informs the user who created the record',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .where('module', 'Quote')
      .where('namespace', 'crm')
  },

  async exec ({ $record, $page, $namespace }, { Compose, ComposeUI, System }) {
    // Check if it can be reviewed
    if ($record.values.Status !== 'Draft' && $record.values.Status !== 'Needs Review') {
      ComposeUI.warning('A quote needs to have the status Draft or Needs Review in order to be sent for approval')
      return
    }

    // Set the status
    $record.values.Status = 'In Review'

    // Saves the quote and inform
    await Compose.saveRecord($record)
    // Get the email of the owner
    return System.findUserByID($record.createdBy).then(async user => {
      // Send the mail
      await Compose.sendMail(
        user.email, // Change this to the email address of the person that needs to approve the quotes
        `Quote "${$record.values.Name}" needs approval`,
        { html: `The following quote needs approval: <br><br><a href="https://latest.cortezaproject.org/compose/ns/${$namespace.slug}/pages/${$page.pageID}/record/${$record.recordID}/edit">${$record.values.Name}<a>` }
      )

      // Notify current user
      ComposeUI.success('The quote has been sent for approval.')
    }).catch(({ message }) => {
      throw new Error(message)
    })
  }
}
