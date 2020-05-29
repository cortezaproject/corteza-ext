import DocuSignClient from '../../lib'
import pdf2base64 from 'pdf-to-base64'
import { loadCreds } from './util'

export default {
  label: 'Send Quote for E-Signature',
  description: 'Sends Quote to contact for signing via DocuSign',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .uiProp('app', 'compose')
  },

  async exec ({ $record, $namespace }, { Compose }) {
    const name = $record.values.Name
    let Document = $record.values.QuoteFile

    Document = await Compose.findAttachmentByID(Document, $namespace)
    const fileUrl = Compose.ComposeAPI.baseURL + Document.url

    if ($record.values.SignatureStatus === 'sent') {
      throw new Error('Document is already out to be signed')
    } else if (!Document.url) {
      throw new Error('Document URL is missing')
    } else if (!Document.meta.ext !== 'pdf') {
      throw new Error('Document is not PDF')
    }

    return pdf2base64(fileUrl).then(async document => {

      let signers = $record.values.Email
      if (!Array.isArray(signers)) {
        signers = [signers]
      }

      if (!Document) {
        throw new Error('Document to be signed is missing')
      }

      if (!signers) {
        throw new Error('Emails to E-Sign this document are missing')
      }

      if (!name) {
        throw new Error('Document name is missing')
      }

      const cfg = await loadCreds(Compose)
      const client = new DocuSignClient(cfg.AccessToken, cfg.AccountID)

      const subject = 'Document ready for signing'
      const documentId = await client.SendEnvelope({ document, name, subject, signers })
      $record.values.DocuSignId = documentId
      $record.values.SignatureStatus = 'sent'

      if ($record.values.OpportunityId) {
        await Compose.findRecordByID($record.values.OpportunityId, 'Opportunity').then(async opportunityRecord => {
          opportunityRecord.SignatureStatus = 'sent'
          await Compose.saveRecord(opportunityRecord)
        })
      }

      return Compose.saveRecord($record)
    }).catch(e => {
      throw new Error(e)
    })
  }
}
