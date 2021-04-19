// SPDX-FileCopyrightText: 2020, Jože Fortun, Tomaž Jerman
// SPDX-License-Identifier: Apache-2.0

import docusign from 'docusign-esign'

export default class DocusignClient {
	constructor (accessToken, accountId, baseUrl, production = false) {
    if (!accessToken) {
      throw new Error('Invalid access token')
		}

		if (!accountId) {
      throw new Error('Invalid accountID')
		}

		if (!baseUrl) {
			throw new Error('Missing baseUrl')
		}

		this.baseUrl = baseUrl.replace(/\/$/gi, '') + '/restapi'
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
   * @param {Array<String>} cc The emails of recipients that should recieve a carbon copy of the signed document
	 */
	async SendEnvelope ({ document = null, name = '', subject = '', signers = [], cc = [], tags = {} }) {
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
	
		signers = signers.map(({ fullName, email, title }, index) => {
			const pl = {
				recipientId: index + 1,
				name: email,
				roleName: 'signer',
				email,
				tabs: {}
			}

			pl.tabs.textTabs = []

			if (tags.signature) {
				pl.tabs.signHereTabs = [{
					anchorString: tags.signature,
					anchorXOffset: '0.8',
					anchorYOffset: '0',
					anchorUnits: 'inches'
				}]
			}
			if (tags.fullName) {
				pl.tabs.textTabs.push({
					tabId: 'fullName_tab',
					tabLabel: 'Full Name',
					anchorString: tags.fullName,
					anchorXOffset: '50',
					anchorYOffset: '-4',
					anchorUnits: 'pixels',
					locked: 'false',
					value: fullName || ''
				})
			}
			if (tags.title) {
				pl.tabs.textTabs.push({
					tabLabel: 'Title',
					anchorString: tags.title,
					anchorXOffset: '50',
					anchorYOffset: '-4',
					anchorUnits: 'pixels',
					locked: 'false',
					value: title || ''
				})
			}
			if (tags.dateSigned) {
				pl.tabs.dateSignedTabs = [{
					anchorString: tags.dateSigned,
					anchorXOffset: '50',
					anchorYOffset: '-2',
					anchorUnits: 'pixels'
				}]
			}
			return docusign.Signer.constructFromObject(pl)
		})

		if (!signers.length) {
			throw new Error('Signers not set')
		}

		// Add cc (Carbon copy) recipients to signers
		const carbonCopies = cc.map((email, index) => {
			return docusign.Signer.constructFromObject({
				recipientId: (signers.length + index + 1),
				name: email,
				roleName: 'cc',
				email
			})
		})

		// Add the recipients object to the envelope definition.
		envelopeDefinition.recipients = docusign.Recipients.constructFromObject({ carbonCopies, signers })

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
