// SPDX-FileCopyrightText: 2020, Jože Fortun, Tomaž Jerman
// SPDX-License-Identifier: Apache-2.0

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

  async exec ({ $record, $namespace }, { Compose, System }) {
    const name = $record.values.Name
    let Document = $record.values.QuoteFile

    Document = await Compose.findAttachmentByID(Document, $namespace)
    const fileUrl = Compose.ComposeAPI.baseURL + Document.url

    if ($record.values.SignatureStatus === 'sent') {
      throw new Error('Document is already out to be signed')
    } else if (!Document.url) {
      throw new Error('Document URL is missing')
    } else if (Document.meta.original.ext !== 'pdf') {
      throw new Error('Document is not PDF')
    }

    return pdf2base64(fileUrl).then(async document => {

      let signers = $record.values.Email
      if (!Array.isArray(signers)) {
        signers = [signers]
      }

      const contact = await Compose.findRecordByID($record.values.ContactId, 'Contact')
      let fullName = ''
      let title = ''
      if (contact) {
        fullName = `${contact.values.FirstName || ''} ${contact.values.LastName || ''}`.trim()
        title = contact.values.Title || ''
      }
      signers = signers.map(email => {
        return { fullName, email, title }
      })

      const cc = []

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
      const client = new DocuSignClient(cfg.AccessToken, cfg.AccountID, cfg.BaseURL, cfg.InProduction)

      const salesRep = await System.findUserByID($record.createdBy)
      if (salesRep) {
        cc.push(salesRep.email)
      }
      const subject = 'Document ready for signing'
      const tags = {
        signature: cfg.AutoSignTag,
        fullName: cfg.AutoNameTag,
        title: cfg.AutoTitleTag,
        dateSigned: cfg.AutoDateTag,
      }
      const documentId = await client.SendEnvelope({ document, name, subject, signers, cc, tags })
      $record.values.DocuSignId = documentId
      $record.values.SignatureStatus = 'sent'

      if ($record.values.OpportunityId) {
        await Compose.findRecordByID($record.values.OpportunityId, 'Opportunity')
          .then(async opportunityRecord => {
            opportunityRecord.values.SignatureStatus = 'sent'
            await Compose.saveRecord(opportunityRecord)
          })
      }

      return Compose.saveRecord($record)
    }).catch(e => {
      throw new Error(e)
    })
  }
}
