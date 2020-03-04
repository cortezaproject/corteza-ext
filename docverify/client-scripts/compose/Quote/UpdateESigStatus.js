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
      const client = new DocVerifyClient('DmmU1neqVCWfy2FUIlQbb1V9y8QT4oPv', '6B5DEADBD2A441900F00B720512ED63C')
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
