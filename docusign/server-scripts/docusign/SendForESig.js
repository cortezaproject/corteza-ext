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

  async exec ({ $record, $namespace }, { Compose, ComposeUI }) {
    const name = $record.values.Name
    let Document = $record.values.QuoteFile

    Document = await Compose.findAttachmentByID(Document, $namespace)
    const fileUrl = Compose.ComposeAPI.baseURL + Document.url

    if ($record.values.SignatureStatus === 'sent') {
      ComposeUI.warning('Document is already out to be signed')
      return
    } else if (!Document.url) {
      ComposeUI.warning('Document URL is missing')
      return
    } else if (Document.meta.original.ext !== 'pdf') {
      ComposeUI.warning('Document is not PDF')
      return
    }

    return pdf2base64(fileUrl).then(async document => {

      let signers = $record.values.Email
      if (!Array.isArray(signers)) {
        signers = [signers]
      }

      if (!Document) {
        ComposeUI.warning('Document to be signed is missing')
        return
      }

      if (!signers) {
        ComposeUI.warning('Emails to E-Sign this document are missing')
        return
      }

      if (!name) {
        ComposeUI.warning('Document name is missing')
        return
      }

      const cfg = await loadCreds(Compose)
      const client = new DocuSignClient(cfg.AccessToken, cfg.AccountID, cfg.BaseURL, cfg.InProduction)

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

      ComposeUI.success('Document sent')

      return Compose.saveRecord($record)
    }).catch(e => {
      throw new Error(e)
    })
  }
}
