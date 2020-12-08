export default {
  label: 'Create new Case from this Contact',
  description: 'Creates a new Case record from and existing Contact',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .where('module', 'Contact')
      .where('namespace', 'crm')
      .uiProp('app', 'compose')
  },

  async exec ({ $record }, { Compose, ComposeUI }) {
    const settings = await Compose.findLastRecord('Settings')

    // Map the case number
    let nextCaseNumber = settings.values.CaseNextNumber
    if (!nextCaseNumber || isNaN(nextCaseNumber)) {
      nextCaseNumber = 0
    }

    const cse = await Compose.saveRecord(Compose.makeRecord({
      OwnerId: $record.values.OwnerId,
      Subject: '(no subject)',
      ContactId: $record.recordID,
      AccountId: $record.values.AccountId,
      Status: 'New',
      Priority: 'Low',
      SuppliedName: $record.values.FirstName + ' ' + $record.values.LastName,
      SuppliedEmail: $record.values.Email,
      SuppliedPhone: $record.values.Phone,
      CaseNumber: ('' + nextCaseNumber).padStart(8, '0')
    }, 'Case'))

    settings.values.CaseNextNumber = parseInt(nextCaseNumber, 10) + 1
    await Compose.saveRecord(settings)

    ComposeUI.success('The new case has been created.')
    ComposeUI.gotoRecordEditor(cse)
    return cse
  }
}
