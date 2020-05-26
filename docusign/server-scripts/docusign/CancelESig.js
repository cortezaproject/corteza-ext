import DocuSignClient from '../../lib'

export default {
  label: 'Cancel Quote E-Signature',
  description: 'Cancels Quote sent for signing',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .uiProp('app', 'compose')
  },

  async exec ({ $record }, { Compose }) {
    if ($record.values.DocuSignId) {
      const accessToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6IjY4MTg1ZmYxLTRlNTEtNGNlOS1hZjFjLTY4OTgxMjIwMzMxNyJ9.eyJUb2tlblR5cGUiOjUsIklzc3VlSW5zdGFudCI6MTU5MDQ3NTQ3OCwiZXhwIjoxNTkwNTA0Mjc4LCJVc2VySWQiOiI3YTU1MmZhNC01ZDJjLTQ3ZWUtOWFlOC03YmIwZTE4NjExMmYiLCJzaXRlaWQiOjEsInNjcCI6WyJzaWduYXR1cmUiLCJjbGljay5tYW5hZ2UiLCJvcmdhbml6YXRpb25fcmVhZCIsInJvb21fZm9ybXMiLCJncm91cF9yZWFkIiwicGVybWlzc2lvbl9yZWFkIiwidXNlcl9yZWFkIiwidXNlcl93cml0ZSIsImFjY291bnRfcmVhZCIsImRvbWFpbl9yZWFkIiwiaWRlbnRpdHlfcHJvdmlkZXJfcmVhZCIsImR0ci5yb29tcy5yZWFkIiwiZHRyLnJvb21zLndyaXRlIiwiZHRyLmRvY3VtZW50cy5yZWFkIiwiZHRyLmRvY3VtZW50cy53cml0ZSIsImR0ci5wcm9maWxlLnJlYWQiLCJkdHIucHJvZmlsZS53cml0ZSIsImR0ci5jb21wYW55LnJlYWQiLCJkdHIuY29tcGFueS53cml0ZSJdLCJhdWQiOiJmMGYyN2YwZS04NTdkLTRhNzEtYTRkYS0zMmNlY2FlM2E5NzgiLCJhenAiOiJmMGYyN2YwZS04NTdkLTRhNzEtYTRkYS0zMmNlY2FlM2E5NzgiLCJpc3MiOiJodHRwczovL2FjY291bnQtZC5kb2N1c2lnbi5jb20vIiwic3ViIjoiN2E1NTJmYTQtNWQyYy00N2VlLTlhZTgtN2JiMGUxODYxMTJmIiwiYW1yIjpbImludGVyYWN0aXZlIl0sImF1dGhfdGltZSI6MTU5MDQ3NTQ3NSwicHdpZCI6IjIwMzE4MTViLTU1YWUtNDQxYS05MTM5LTkwMDY4NDIzNjg4ZiJ9.bG0Xoyn5VPPXO-mj8rrDXm4xrWanonYh3Gn9CfF32lFWLkr5JnC4PMq5lCGBUIDrnNeMoczfGfh0wNpX7xq-a-aDPe3_t0uB38-ZDdKX6GnuE6VG-ZSSX0wIkUKTLtkH_hh3NvPppLaDVCHph-t18I--WmC87AYggXLhSk8OKvjeBalgBprdLw-EC2QzjCi3mUZpJXcCg_oRtGTa5PiLLUjOzosbsy3V9vea73R9FfXKmPsuuEZ0wGwSLoR05hdJ7PrSyPXqVRQUNmXq7s3fS3oSZLVEGMcXjGXQMS1uM6o8V3tEvj6DWYfJuowNQ9ti2NYxdioDHoUSuqUOBtch2g"
      const accountId = "603fe0cb-ea70-4f4e-897e-2ce4a681673b"
      const client = new DocuSignClient(accessToken, accountId)

      await client.VoidEnvelope($record.values.DocuSignId)

      if ($record.values.OpportunityId) {
        await Compose.findRecordByID($record.values.OpportunityId, 'Opportunity')
          .then(async opportunityRecord => {
            opportunityRecord.values.SignatureStatus = 'voided'
            await Compose.saveRecord(opportunityRecord)
          })
      }
  
      $record.values.DocuSignId = undefined
      $record.values.SignatureStatus = 'voided'

      return $record
    } else {
      throw new Error('Cannot update E-Signature status for unexisting document')
    }
  }
}
