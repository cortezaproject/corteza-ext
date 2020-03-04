import DocVerifyClient from '../../../lib'

export default {
  label: 'Send Quote for E-Signature',
  description: 'Sends Quote to contact for signing via DocVerify',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .where('namespace', 'crm')
      .uiProp('app', 'compose')
  },

  async exec ({ $record }, { Compose }) {
    const file = $record.QuoteFile
    let email = $record.Email
    const name = $record.Name
    if (Array.isArray(email)) {
      email = email.join(';')
    }

    if (!file) {
      throw new Error('Document to be signed is missing')
    }

    if (!email) {
      throw new Error('Email to E-Sign this document are missing')
    }

    if (!name) {
      throw new Error('Document name is missing')
    }

    const client = new DocVerifyClient('DmmU1neqVCWfy2FUIlQbb1V9y8QT4oPv', '6B5DEADBD2A441900F00B720512ED63C')
    const docverifyID = await client.AddNewDocumentESign({ Document: file, DocumentName: name, Emails: email })

    const opportunityRecord = await Compose.findRecordByID($record.values.OpportunityId, 'Opportunity')
    opportunityRecord.values['docverifyesign__Sent_for_signature__c'] = false
    
    await Compose.saveRecord(opportunityRecord)

    $record.values.DocverifyID = docverifyID
    $record.values['docverifyesign__Sent_for_signature__c'] = true
    return await Compose.saveRecord($record)
  }
}
