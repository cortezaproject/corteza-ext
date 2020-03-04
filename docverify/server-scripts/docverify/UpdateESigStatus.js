import DocVerifyClient from '../../lib'

export default {
  label: 'Update E-Signature Status',
  description: 'Updates the status of the E-Signature',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .uiProp('app', 'compose')
  },

  async exec ({ $record }, { Compose }) {
    if ($record.values.DocverifyId) {
      const client = new DocVerifyClient('ZfYEuoTeqwQEQ2UHJuyUsv9lOaN7eKsJ', '553F6880C71F154291DEC277A67C979F')
      const response = await client.GetSignatureStatus($record.values.DocverifyId)
      if (response === 'Completed') {
        const opportunityRecord = await Compose.findRecordByID($record.values.OpportunityId, 'Opportunity')
        opportunityRecord.values.IsClosed = true
        opportunityRecord.values.IsWon = true
        
        await Compose.saveRecord(opportunityRecord)
      }
      $record.SignatureStatus = response
      await Compose.saveRecord($record)
    } else {
      throw new Error('Cannot update E-Signature status for unexisting document')
    }
  }
}
