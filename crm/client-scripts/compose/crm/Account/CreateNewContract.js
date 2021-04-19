// SPDX-FileCopyrightText: 2020, Jože Fortun, Tomaž Jerman, Denis Arh 
// SPDX-License-Identifier: Apache-2.0


export default {
  label: 'Create new Contract from this Account',
  description: 'Creates new Contract record from an existing Account',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .where('module', 'Account')
      .where('namespace', 'crm')
      .uiProp('app', 'compose')
  },

  async exec ({ $record }, { Compose, ComposeUI }) {
    // Get the default settings
    const settings = await Compose.findLastRecord('Settings')

    // Map the case number
    let ContractDefaultTime = settings.values.ContractDefaultTime
    if (!ContractDefaultTime || isNaN(ContractDefaultTime)) {
      ContractDefaultTime = 0
    }

    // Get the contract number
    let nextContractNumber = settings.values.ContractNextNumber
    if (!nextContractNumber || isNaN(nextContractNumber)) {
      nextContractNumber = 0
    }

    const contact = await Compose.saveRecord(Compose.makeRecord({
      OwnerId: $record.values.OwnerId,
      AccountId: $record.recordID,
      Status: 'Draft',
      BillingStreet: $record.values.BillingStreet,
      BillingCity: $record.values.BillingCity,
      BillingState: $record.values.BillingState,
      BillingPostalCode: $record.values.BillingPostalCode,
      BillingCountry: $record.values.BillingCountry,
      ShippingStreet: $record.values.BillingStreet,
      ShippingCity: $record.values.BillingCity,
      ShippingState: $record.values.BillingState,
      ShippingPostalCode: $record.values.BillingPostalCode,
      ShippingCountry: $record.values.BillingCountry,
      ContractTerm: ContractDefaultTime,
      ContractNumber: nextContractNumber
    }, 'Contract'))

    settings.values.ContractNextNumber = parseInt(nextContractNumber, 10) + 1
    await Compose.saveRecord(settings)

    ComposeUI.success('The new contract record has been created.')
    ComposeUI.gotoRecordEditor(contact)

    return contact
  }
}
