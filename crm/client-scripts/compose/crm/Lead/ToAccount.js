// SPDX-FileCopyrightText: 2020, Jože Fortun, Tomaž Jerman, Denis Arh 
// SPDX-License-Identifier: Apache-2.0


import { toAccountContact } from '../../../../lib/lead/util'

export default {
  label: 'Convert this Lead into an Account',
  description: 'Creates an Account record from an existing Lead',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .where('module', 'Lead')
      .where('namespace', 'crm')
      .uiProp('app', 'compose')
  },

  async exec ({ $record }, { Compose, ComposeUI, System }) {
    if ($record.values.Status === 'Converted') {
      ComposeUI.warning('This lead is already converted.')
      return
    }

    const { account, contact } = await toAccountContact($record, Compose)

    // Update the lead record
    $record.values.Status = 'Converted'
    $record.values.IsConverted = 'Yes'
    $record.values.ConvertedAccountId = account.recordID
    $record.values.ConvertedContactId = contact.recordID
    $record.values.ConvertedDate = account.createdAt.toISOString()
    await Compose.saveRecord($record)

    // Notify the owner
    const owner = System.findUserByID($record.values.OwnerId)
    // await Compose.sendRecordToMail(
    //   owner.email,
    //   `Lead ${$record.values.FirstName} ${$record.values.LastName} from ${$record.values.Company} has been converted`,
    //   {
    //     header: '<h1>The following lead has been converted:</h1>'
    //   },
    //   account
    // )

    console.log(
      owner.email,
      `Lead ${$record.values.FirstName} ${$record.values.LastName} from ${$record.values.Company} has been converted`,
      {
        header: '<h1>The following lead has been converted:</h1>'
      },
      account
    )

    ComposeUI.success('The lead has been converted.')
    ComposeUI.gotoRecordViewer(account)
  }
}
