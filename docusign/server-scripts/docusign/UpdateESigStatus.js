import DocuSignClient from '../../lib'
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

    const accessToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6IjY4MTg1ZmYxLTRlNTEtNGNlOS1hZjFjLTY4OTgxMjIwMzMxNyJ9.eyJUb2tlblR5cGUiOjUsIklzc3VlSW5zdGFudCI6MTU5MDQ3NTQ3OCwiZXhwIjoxNTkwNTA0Mjc4LCJVc2VySWQiOiI3YTU1MmZhNC01ZDJjLTQ3ZWUtOWFlOC03YmIwZTE4NjExMmYiLCJzaXRlaWQiOjEsInNjcCI6WyJzaWduYXR1cmUiLCJjbGljay5tYW5hZ2UiLCJvcmdhbml6YXRpb25fcmVhZCIsInJvb21fZm9ybXMiLCJncm91cF9yZWFkIiwicGVybWlzc2lvbl9yZWFkIiwidXNlcl9yZWFkIiwidXNlcl93cml0ZSIsImFjY291bnRfcmVhZCIsImRvbWFpbl9yZWFkIiwiaWRlbnRpdHlfcHJvdmlkZXJfcmVhZCIsImR0ci5yb29tcy5yZWFkIiwiZHRyLnJvb21zLndyaXRlIiwiZHRyLmRvY3VtZW50cy5yZWFkIiwiZHRyLmRvY3VtZW50cy53cml0ZSIsImR0ci5wcm9maWxlLnJlYWQiLCJkdHIucHJvZmlsZS53cml0ZSIsImR0ci5jb21wYW55LnJlYWQiLCJkdHIuY29tcGFueS53cml0ZSJdLCJhdWQiOiJmMGYyN2YwZS04NTdkLTRhNzEtYTRkYS0zMmNlY2FlM2E5NzgiLCJhenAiOiJmMGYyN2YwZS04NTdkLTRhNzEtYTRkYS0zMmNlY2FlM2E5NzgiLCJpc3MiOiJodHRwczovL2FjY291bnQtZC5kb2N1c2lnbi5jb20vIiwic3ViIjoiN2E1NTJmYTQtNWQyYy00N2VlLTlhZTgtN2JiMGUxODYxMTJmIiwiYW1yIjpbImludGVyYWN0aXZlIl0sImF1dGhfdGltZSI6MTU5MDQ3NTQ3NSwicHdpZCI6IjIwMzE4MTViLTU1YWUtNDQxYS05MTM5LTkwMDY4NDIzNjg4ZiJ9.bG0Xoyn5VPPXO-mj8rrDXm4xrWanonYh3Gn9CfF32lFWLkr5JnC4PMq5lCGBUIDrnNeMoczfGfh0wNpX7xq-a-aDPe3_t0uB38-ZDdKX6GnuE6VG-ZSSX0wIkUKTLtkH_hh3NvPppLaDVCHph-t18I--WmC87AYggXLhSk8OKvjeBalgBprdLw-EC2QzjCi3mUZpJXcCg_oRtGTa5PiLLUjOzosbsy3V9vea73R9FfXKmPsuuEZ0wGwSLoR05hdJ7PrSyPXqVRQUNmXq7s3fS3oSZLVEGMcXjGXQMS1uM6o8V3tEvj6DWYfJuowNQ9ti2NYxdioDHoUSuqUOBtch2g"
    const accountId = "603fe0cb-ea70-4f4e-897e-2ce4a681673b"

    const client = new DocuSignClient(accessToken, accountId)

    records.forEach(async record => {
      if (record.values.DocuSignId && record.values.SignatureStatus !== 'completed') {
        const status = await client.GetSignatureStatus(record.values.DocuSignId)

        if (status === 'completed') {
          if (record.values.OpportunityId) {
            await Compose.findRecordByID(record.values.OpportunityId, 'Opportunity')
              .then(async opportunityRecord => {
                opportunityRecord.values.IsClosed = true
                opportunityRecord.values.IsWon = true
                await Compose.saveRecord(opportunityRecord)
              })
          }

          await client.GetDocument(record.values.DocuSignId)
            .then(async res => {
              const fd = new FormData()
              fd.append('upload', Buffer.from(res, 'binary'), {
                filename: `${record.values.QuoteNumber}_signed.pdf`,
                contentType: 'application/pdf'
              })
              record.values.QuoteFile = await this.attachFile($namespace, $module, fd, Compose)
            })
        }

        record.values.SignatureStatus = status
        await Compose.saveRecord(record)
      }
    })
  }
}
