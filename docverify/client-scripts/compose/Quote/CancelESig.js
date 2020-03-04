import DocVerifyClient from '../../../lib'

export default {
  label: 'Cancel Quote E-Signature',
  description: 'Cancels Quote sent for signing',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .where('namespace', 'crm')
      .uiProp('app', 'compose')
  },

  async exec ({ $record }, { Compose }) {
    if ($record.values.DocverifyID) {
      const client = new DocVerifyClient('DmmU1neqVCWfy2FUIlQbb1V9y8QT4oPv', '6B5DEADBD2A441900F00B720512ED63C')
      const response = await client.CancelESign($record.values.DocverifyID)

      if (response === 'Success') {
        const opportunityRecord = await Compose.findRecordByID($record.values.OpportunityId, 'Opportunity')
        opportunityRecord.values['docverifyesign__Sent_for_signature__c'] = false
        
        await Compose.saveRecord(opportunityRecord)

        $record.values.DocverifyID = undefined
        $record.values['docverifyesign__Sent_for_signature__c'] = false

        return await Compose.saveRecord($record)
      } else if (response === 'Already Cancelled') {
        throw new Error('Document E-Signature already cancelled')
      } else if (response === 'Not Found') {
        throw new Error('Document not found')
      }
    } else {
      throw new Error('Cannot update E-Signature status for unexisting document')
    }
  }
}
