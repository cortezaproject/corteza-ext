import DocVerifyClient from '../../lib'

export default {
  label: 'Cancel Quote E-Signature',
  description: 'Cancels Quote sent for signing',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .uiProp('app', 'compose')
  },

  async exec ({ $record }, { Compose, ComposeUI }) {
    if ($record.values.DocverifyID) {
      const client = new DocVerifyClient('7F7KCY10mMDc9DhKs9iNKVppzB7bQh1v', 'B179274AD55C6A7D43DC7258020D8103')
      const response = await client.CancelESign($record.values.DocverifyID)

      if (response === 'Success') {
        const opportunityRecord = await Compose.findRecordByID($record.values.OpportunityId, 'Opportunity')
        opportunityRecord.values['docverifyesign__Sent_for_signature__c'] = false
        
        await Compose.saveRecord(opportunityRecord)

        $record.values.DocverifyID = undefined
        $record.values['docverifyesign__Sent_for_signature__c'] = false

        await Compose.saveRecord($record)
        ComposeUI.success('Quote E-Signature cancelled')

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
