// SPDX-FileCopyrightText: 2020, Jože Fortun, Tomaž Jerman, Denis Arh 
// SPDX-License-Identifier: Apache-2.0


export default {
  label: 'Create new Case from this Account',
  description: 'Creates new Case record from an existing Account',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .where('module', 'Account')
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

    // Find the contact we want to link the new case to (by default, the primary contact)
    const contact = await Compose.findRecords(`AccountId = ${$record.recordID}`, 'Contact')
      .then(({ set: contacts }) => contacts.find(({ values }) => values.IsPrimary))

    if (!contact) {
      ComposeUI.warning('The primary contact is not defined.')
      return
    }

    const cse = await Compose.saveRecord(Compose.makeRecord({
      OwnerId: $record.values.OwnerId,
      Subject: '(no subject)',
      ContactId: contact.recordID,
      AccountId: $record.recordID,
      Status: 'New',
      Priority: 'Low',
      SuppliedName: (contact.values.FirstName + ' ' + contact.values.LastName).trim(),
      SuppliedEmail: contact.values.Email,
      SuppliedPhone: contact.values.Phone,
      CaseNumber: ('' + nextCaseNumber).padStart(8, '0')
    }, 'Case'))

    settings.values.CaseNextNumber = parseInt(nextCaseNumber, 10) + 1
    await Compose.saveRecord(settings)

    ComposeUI.success('The new case has been created.')
    ComposeUI.gotoRecordEditor(cse)
    return cse
  }
}
