import DocVerifyClient from '../../lib'

const docverifysignField = 'docverifyesign__Sent_for_signature__c'

export default {
  label: 'Cancel Quote E-Signature',
  description: 'Cancels Quote sent for signing',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .uiProp('app', 'compose')
  },

  async exec ({ $record }, { Compose }) {
    if ($record.values.DocverifyId) {
      const client = new DocVerifyClient('ZfYEuoTeqwQEQ2UHJuyUsv9lOaN7eKsJ', '553F6880C71F154291DEC277A67C979F')
      const response = await client.CancelESign($record.values.DocverifyId)

      if (response === 'Success') {
        Compose.findRecordByID($record.values.OpportunityId, 'Opportunity')
          .then(async opportunityRecord => {
            opportunityRecord.values[docverifysignField] = false
            await Compose.saveRecord(opportunityRecord)
          })

        $record.values.DocverifyId = undefined
        $record.values[docverifysignField] = false

        await Compose.saveRecord($record)
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
