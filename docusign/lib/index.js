import docusign from 'docusign-esign'

export default class DocusignClient {
	constructor (accessToken, accountId) {
    if (!accessToken) {
      throw new Error('Invalid access token')
		}

		if (!accountId) {
      throw new Error('Invalid accountID')
		}

		this.baseUrl = 'https://demo.docusign.net/restapi'
		this.accessToken = accessToken
		this.accountId = accountId

		// Configure ApiClient
		this.apiClient = new docusign.ApiClient()
		this.apiClient.setBasePath(this.baseUrl)
		this.apiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken)

		// Set the DocuSign SDK components to use the apiClient object
		docusign.Configuration.default.setDefaultApiClient(this.apiClient)
	}

	/**
	 *  Send the envelope(document) to be signed
	 * @param {Base64Binary} document base64binary of pdf document
   * @param {String} name The name of the document
   * @param {String} subject The subject of the document
   * @param {Array<String>} signers The emails of signers that should sign the document
	 */
	async SendEnvelope ({ document = null, name = '', subject = '', signers = [] }) {
		const envelopeDefinition = new docusign.EnvelopeDefinition()

		// Set the Email Subject line and email message
		envelopeDefinition.emailSubject = subject
		envelopeDefinition.emailBlurb = subject
	
		// Read the file from the document and convert it to a Base64String
		document = document.toString('base64')

		// Create the document request object
		const doc = docusign.Document.constructFromObject({
			documentId: '1',
			documentBase64: document,
			fileExtension: 'pdf',
			name,
		})
	
		// Create a documents object array for the envelope definition and add the doc object
		envelopeDefinition.documents = [doc]
	
		signers = signers.map((email, index) => {
			return docusign.Signer.constructFromObject({
				recipientId: index + 1,
				name: email,
				email
			})
		})

		if (!signers.length) {
			throw new Error('Signers not set')
		}

		// Add the recipients object to the envelope definition.
		envelopeDefinition.recipients = docusign.Recipients.constructFromObject({ signers })

		// Set the Envelope status. For drafts, use 'created' To send the envelope right away, use 'sent'
		envelopeDefinition.status = 'sent'
	
		// Send the envelope
		const envelopesApi = new docusign.EnvelopesApi()
		return await envelopesApi.createEnvelope(this.accountId, { envelopeDefinition }).then(results => {
			// Envelope has been created
			return results.envelopeId
		}).catch(e => {
			let body = e.response && e.response.body
			if (body) {
				// DocuSign API exception
				throw new Error(body.message)
			} else {
				// Not a DocuSign exception
				throw e
			}
		})
	}

	/**
	 *  Void(cancel) document sign
   * @param {String} envelopeId The id of the envelope
	 */
	async VoidEnvelope (envelopeId) {
		const envelope = new docusign.Envelope.constructFromObject({
			status: 'voided',
			voidedReason: 'Quote voided'
		})

		const envelopesApi = new docusign.EnvelopesApi()
		return await envelopesApi.update(this.accountId, envelopeId, { envelope }).then(results => {
			return results.envelopeId
		}).catch(e => {
			let body = e.response && e.response.body
			if (body) {
				// DocuSign API exception
				throw new Error(body.message)
			} else {
				// Not a DocuSign exception
				throw e
			}
		})
	}

	/**
	 *  Get envelope status
	 * @param {String} envelopeId The id of the envelope
	 */
	async GetSignatureStatus (envelopeId) {
		const envelopesApi = new docusign.EnvelopesApi()
		return await envelopesApi.getEnvelope(this.accountId, envelopeId, null).then(results => {
			return results.status
		}).catch(e => {
			let body = e.response && e.response.body
			if (body) {
				// DocuSign API exception
				throw new Error(body.message)
			} else {
				// Not a DocuSign exception
				throw e
			}
		})
	}

	/**
	 *  Get envelope status
	 * @param {String} envelopeId The id of the envelope
	 */
	async GetDocument (envelopeId) {
		const envelopesApi = new docusign.EnvelopesApi()

		return await envelopesApi.getDocument(this.accountId, envelopeId, '1', null).then(results => {
			return results
		}).catch(e => {
			let body = e.response && e.response.body
			if (body) {
				// DocuSign API exception
				throw new Error(body.message)
			} else {
				// Not a DocuSign exception
				throw e
			}
		})
	}
}

const accessToken = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImtpZCI6IjY4MTg1ZmYxLTRlNTEtNGNlOS1hZjFjLTY4OTgxMjIwMzMxNyJ9.eyJUb2tlblR5cGUiOjUsIklzc3VlSW5zdGFudCI6MTU5MDQ3NTQ3OCwiZXhwIjoxNTkwNTA0Mjc4LCJVc2VySWQiOiI3YTU1MmZhNC01ZDJjLTQ3ZWUtOWFlOC03YmIwZTE4NjExMmYiLCJzaXRlaWQiOjEsInNjcCI6WyJzaWduYXR1cmUiLCJjbGljay5tYW5hZ2UiLCJvcmdhbml6YXRpb25fcmVhZCIsInJvb21fZm9ybXMiLCJncm91cF9yZWFkIiwicGVybWlzc2lvbl9yZWFkIiwidXNlcl9yZWFkIiwidXNlcl93cml0ZSIsImFjY291bnRfcmVhZCIsImRvbWFpbl9yZWFkIiwiaWRlbnRpdHlfcHJvdmlkZXJfcmVhZCIsImR0ci5yb29tcy5yZWFkIiwiZHRyLnJvb21zLndyaXRlIiwiZHRyLmRvY3VtZW50cy5yZWFkIiwiZHRyLmRvY3VtZW50cy53cml0ZSIsImR0ci5wcm9maWxlLnJlYWQiLCJkdHIucHJvZmlsZS53cml0ZSIsImR0ci5jb21wYW55LnJlYWQiLCJkdHIuY29tcGFueS53cml0ZSJdLCJhdWQiOiJmMGYyN2YwZS04NTdkLTRhNzEtYTRkYS0zMmNlY2FlM2E5NzgiLCJhenAiOiJmMGYyN2YwZS04NTdkLTRhNzEtYTRkYS0zMmNlY2FlM2E5NzgiLCJpc3MiOiJodHRwczovL2FjY291bnQtZC5kb2N1c2lnbi5jb20vIiwic3ViIjoiN2E1NTJmYTQtNWQyYy00N2VlLTlhZTgtN2JiMGUxODYxMTJmIiwiYW1yIjpbImludGVyYWN0aXZlIl0sImF1dGhfdGltZSI6MTU5MDQ3NTQ3NSwicHdpZCI6IjIwMzE4MTViLTU1YWUtNDQxYS05MTM5LTkwMDY4NDIzNjg4ZiJ9.bG0Xoyn5VPPXO-mj8rrDXm4xrWanonYh3Gn9CfF32lFWLkr5JnC4PMq5lCGBUIDrnNeMoczfGfh0wNpX7xq-a-aDPe3_t0uB38-ZDdKX6GnuE6VG-ZSSX0wIkUKTLtkH_hh3NvPppLaDVCHph-t18I--WmC87AYggXLhSk8OKvjeBalgBprdLw-EC2QzjCi3mUZpJXcCg_oRtGTa5PiLLUjOzosbsy3V9vea73R9FfXKmPsuuEZ0wGwSLoR05hdJ7PrSyPXqVRQUNmXq7s3fS3oSZLVEGMcXjGXQMS1uM6o8V3tEvj6DWYfJuowNQ9ti2NYxdioDHoUSuqUOBtch2g"

const accountId = "603fe0cb-ea70-4f4e-897e-2ce4a681673b"

const docusignClient = new DocusignClient(accessToken, accountId)

const name = 'Test PDF'
const subject = 'Test subject'
const signerName = "Jože Fortun"
const signers = ["joze.fortun@gmail.com"]

// docusignClient.SendEnvelope({ document, name, subject, signerName, signers }).then(envID => {
// 	console.log(envID)
// }).catch(e => {
// 	console.error(e)
// })


// docusignClient.VoidEnvelope('6c7159d7-debc-4ded-8e45-76dcb9e96499').then(res => {
// 	console.log(res)
// }).catch(e => {
// 	console.error(e)
// })


// docusignClient.GetEnvelopeStatus('207850d5-df39-4025-aefe-fb37b13bf510').then(res => {
// 	console.log(res)
// }).catch(e => {
// 	console.error(e)
// })


docusignClient.GetDocument('207850d5-df39-4025-aefe-fb37b13bf510').then(res => {
	console.log(res)
}).catch(e => {
	console.error(e)
})