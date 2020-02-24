export default {
  name: 'CreateNewContract',
  label: 'Creates new contract from an account',
  description: 'Creates new record in Contract module for the specified account',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .where('module', 'Account')
      .where('namespace', 'crm')
      .uiProp('app', 'compose')
  },

  async exec ({ $record }, { Compose, ComposeUI }) {
    // Get the default settings
    return Compose.findLastRecord('Settings').then(settings => {
      // Map the case number
      let ContractDefaultTime = settings.values.ContractDefaultTime
      if (!ContractDefaultTime|| isNaN(ContractDefaultTime)) {
        ContractDefaultTime = 0
      }

      // Get the contract number
      let nextContractNumber = settings.values.ContractNextNumber
      if (!nextContractNumber || isNaN(nextContractNumber)) {
        nextContractNumber = 0
      }

      return Compose.makeRecord({
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
      }, 'Contract').then(async myContract => {
        // Save new Contract record
        const mySavedContract = await Compose.saveRecord(myContract)

        // Update the config
        const nextContractNumberUpdated = parseInt(nextContractNumber, 10) + 1
        settings.values.ContractNextNumber = nextContractNumberUpdated
        await Compose.saveRecord(settings)

        // Notify current user
        ComposeUI.success('The new contract record has been created.')

        // Go to the record
        ComposeUI.gotoRecordEditor(mySavedContract)

        return mySavedContract
      })
    })
  }
}
