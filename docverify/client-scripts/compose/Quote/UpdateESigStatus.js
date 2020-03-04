import DocVerifyClient from '../../../lib'

export default {
  label: 'Update E-Signature Status',
  description: 'Updates the status of the E-Signature',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .where('namespace', 'crm')
      .uiProp('app', 'compose')
  },

  async exec ({ $record }, { Compose }) {
    if ($record.values.DocverifyID) {
      const client = new DocVerifyClient('7F7KCY10mMDc9DhKs9iNKVppzB7bQh1v', 'B179274AD55C6A7D43DC7258020D8103')
      const response = await client.GetSignatureStatus($record.values.DocverifyID)
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
