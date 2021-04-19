// SPDX-FileCopyrightText: 2020, Jože Fortun 
// SPDX-License-Identifier: Apache-2.0

import DocVerifyClient from '../../lib'
import pdf2base64 from 'pdf-to-base64'

const docverifysignField = 'docverifyesign__Sent_for_signature__c'

export default {
  label: 'Send Quote for E-Signature',
  description: 'Sends Quote to contact for signing via DocVerify',

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

    if ($record.values[docverifysignField]) {
      throw new Error('Document is already out to be signed')
    } else if (!Document.url) {
      throw new Error('Document URL is missing')
    }

    return pdf2base64(fileUrl).then(async base64pdf => {
      Document = base64pdf

      let email = $record.values.Email
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

      const client = new DocVerifyClient('ZfYEuoTeqwQEQ2UHJuyUsv9lOaN7eKsJ', '553F6880C71F154291DEC277A67C979F')
      const DocverifyId = await client.AddNewDocumentESign({ Document, DocumentName: name, Emails: email })

      Compose.findRecordByID($record.values.OpportunityId, 'Opportunity')
        .then(async opportunityRecord => {
          opportunityRecord.values[docverifysignField] = false
          Compose.saveRecord(opportunityRecord)
        })

      $record.values.DocverifyId = DocverifyId
      $record.values[docverifysignField] = true
      return Compose.saveRecord($record)
    })
  }
}
