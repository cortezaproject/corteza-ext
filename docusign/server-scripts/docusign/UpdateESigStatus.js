import DocuSignClient from '../../lib'
import axios from 'axios'
import FormData from 'form-data'
import { loadCreds } from './util'

export default {
  label: 'Update E-Signature Status',
  description: 'Updates the status of the E-Signature',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .uiProp('app', 'compose')
  },

  async attachFile (ns, mod, fd, Compose) {
    const ep = Compose.ComposeAPI.baseURL + Compose.ComposeAPI.recordUploadEndpoint({
      namespaceID: ns.namespaceID,
      moduleID: mod.moduleID
    })

    const { data } = await axios.post(ep, fd.getBuffer(), {
      headers: {
        ...fd.getHeaders(),
        Authorization: Compose.ComposeAPI.headers.Authorization
      }
    })

    if (data.error) {
      throw new Error(data.error)
    }

    return data.response.attachmentID
  },

  async exec ({ $record, $module, $namespace }, { Compose }) {
    const cfg = await loadCreds(Compose)
    const client = new DocuSignClient(cfg.AccessToken, cfg.AccountID, cfg.BaseURL, cfg.InProduction)

    if ($record.values.DocuSignId) {
      const status = await client.GetSignatureStatus($record.values.DocuSignId)

      if (status === 'completed') {
        if ($record.values.OpportunityId) {
          await Compose.findRecordByID($record.values.OpportunityId, 'Opportunity')
            .then(async opportunityRecord => {
              opportunityRecord.values.IsClosed = true
              opportunityRecord.values.IsWon = true
              await Compose.saveRecord(opportunityRecord)
            })
        }

        await client.GetDocument($record.values.DocuSignId)
          .then(async res => {
            const fd = new FormData()
            fd.append('upload', Buffer.from(res, 'binary'), {
              filename: `${$record.values.QuoteNumber || $record.values.Name}_signed.pdf`,
              contentType: 'application/pdf'
            })
            $record.values.QuoteFile = await this.attachFile($namespace, $module, fd, Compose)
          })
      }

      $record.values.SignatureStatus = status
      return Compose.saveRecord($record)
    } else {
      throw new Error('Cannot update E-Signature status for unexisting document')
    }
  }
}
