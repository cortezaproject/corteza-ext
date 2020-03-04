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

  async exec ({ $record, $namespace }, { Compose }) {
    const name = $record.Name
    let Document = $record.QuoteFile
    Document = await Compose.findAttachmentByID(Document, $namespace)

    fetch(Document.url)
      .then(response => response.blob())
      .then(blob => {
          const reader = new FileReader()

          reader.readAsDataURL(blob)
          reader.onloadend = async () => {
            Document = reader.result

            let email = $record.Email
            if (Array.isArray(email)) {
              email = email.join(';')
            }
        
            if (!Document) {
              throw new Error('Document to be signed is missing')
            }
        
            if (!email) {
              throw new Error('Emails to E-Sign this document are missing')
            }
        
            if (!name) {
              throw new Error('Document name is missing')
            }
        
            const client = new DocVerifyClient('7F7KCY10mMDc9DhKs9iNKVppzB7bQh1v', 'B179274AD55C6A7D43DC7258020D8103')
            const docverifyID = await client.AddNewDocumentESign({ Document, DocumentName: name, Emails: email })
        
            const opportunityRecord = await Compose.findRecordByID($record.values.OpportunityId, 'Opportunity')
            opportunityRecord.values['docverifyesign__Sent_for_signature__c'] = false
            
            await Compose.saveRecord(opportunityRecord)
        
            $record.values.DocverifyID = docverifyID
            $record.values['docverifyesign__Sent_for_signature__c'] = true
            return await Compose.saveRecord($record)
          }
      }).catch(({ message }) => {
        throw new Error(message)
      })
  }
}
