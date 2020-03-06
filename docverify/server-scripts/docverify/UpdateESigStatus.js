import DocVerifyClient from '../../lib'
import axios from 'axios'
import FormData from 'form-data'

export default {
  label: 'Update E-Signature Status',
  description: 'Updates the status of the E-Signature',

  triggers (t) {
    return [
      t.every('0 * * * *')
        .for('compose'),

      t.on('manual')
        .for('compose:record')
        .uiProp('app', 'compose')
    ]
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
    let records = []
    if (!$record) {
      $namespace = await Compose.resolveNamespace('crm')
      $module = await Compose.findModuleByName('Quote', $namespace)
      const { set = [] } = await Compose.findRecords('', $module)
      records = set
    } else {
      records = [$record]
    }
    records.forEach(async record => {
      if (record.values.DocverifyId && record.values.SignatureStatus !== 'Sign Complete') {
        const client = new DocVerifyClient('ZfYEuoTeqwQEQ2UHJuyUsv9lOaN7eKsJ', '553F6880C71F154291DEC277A67C979F')
        const status = await client.GetSignatureStatus(record.values.DocverifyId)

        if (status === 'Sign Complete') {
          Compose.findRecordByID(record.values.OpportunityId, 'Opportunity')
            .then(async opportunityRecord => {
              opportunityRecord.values.IsClosed = true
              opportunityRecord.values.IsWon = true
              await Compose.saveRecord(opportunityRecord)
            })

          client.GetDocument(record.values.DocverifyId)
            .then(async res => {
              const fd = new FormData()
              fd.append('upload', Buffer.from(res, 'base64'), {
                filename: `${record.Name}.pdf`,
                contentType: 'application/pdf'
              })
              record.SignedQuote = await this.attachFile($namespace, $module, fd, Compose)
            })
        }

        record.SignatureStatus = status
        await Compose.saveRecord(record)
      } else {
        throw new Error('Cannot update E-Signature status for unexisting document')
      }
    })
  }
}
