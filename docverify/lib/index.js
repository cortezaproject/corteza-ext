// SPDX-FileCopyrightText: 2020, Jože Fortun
// SPDX-License-Identifier: Apache-2.0

import soap from 'soap'

const returnCodes = {
  '-13': 'Username already exists',
  '-14': 'Email already exists',
  '-30': 'Notary already exists',
  '-100': 'An error has occurred. Please make sure that all of the method properties have the correct values and types',
  '-121': 'Incorrect API key or API Signature',
  '-122': 'Incorrect API key, API Signature, or API Token',
  '-123': 'Please fill in all fields',
  '-124': 'No records found. The APIKey or APISig may be invalid as well.',
  '-130': 'Please choose a credit type.',
  '-140': 'Not enough Document credits',
  '-141': 'Not enough Prepaid credits',
  '-142': 'Cannot use prepaid credits until processing is complete',
  '-143': 'Maximum file size exceeded.',
  '-144': 'Not enough phone credits. Please sign in to the DocVerify portal and purchase more phone credits or disable the feature.',
  '-145': 'PDF is either encrypted or password protected.',
  '-150': 'Not a PDF document',
  '-151': 'DocVerifyID is invalid',
  '-152': 'Make sure emails are valid and semi-colon delimited',
  '-153': 'Must contain at least one valid email address',
  '-154': 'You are not the owner of this document',
  '-155': 'pdf is invalid (may be encrypted or password protected)',
  '-156': 'PDF file is empty. If the packet method is being invoked, then 2 or more PDF\'s are required.',
  '-157': 'Invalid Template ID. Make sure the Template ID is correct.',
  '-158': 'Template ID not found. Please sign in to DocVerify, Add new document page, check the templates checkbox, from the drop down either click the link labeled "Not Set" or "... Signer", and from the Custom template page get the Template ID.',
  '-159': 'User is not valid',
  '-160': 'ESign requires 2 Prepaid credits. Please add more prepaid credits to your account',
  '-161': 'ESign requires at least one valid recipient. Please make sure emails are formatted properly. Cannot contain account owners email. Ex\': johndoe@domain.com',
  '-162': 'Signer Name or Signer Signature is missing.',
  '-163': 'Hand Shake Key or user is invalid.',
  '-170': 'Proof Note failed',
  '-171': 'Please include a Proof Note Message',
  '-172': 'Not enough Note Credits remaining. Please replenish your account',
  '-180': 'This is not a subscription edition account.',
  '-181': 'Subscription has ended. Please go to www.docverify.com and renew.',
  '-182': 'File exceeds available space',
  '-183': 'Subscription account is disabled. Please contact your admin or go to www.docverify.com',
  '-184': 'API access is not permitted. You may have to upgrade your account or the account may have also expired. Please go to www.docverify.com to upgrade.',
  '-185': 'Not enough E-Signature/VeriVault credits remaining. Please purchase more.',
  '-186': 'Subscription account does not allow document integrity vaulting. Please upgrade your subscription edition.',
  '-187': 'Subscription account does not allow external connections such as wufoo. Please upgrade your subscription edition.',
  '-188': 'Subscription account does not allow OneSign. Please upgrade your subscription edition.',
  '-190': 'Account is not vendor approved. Please contact DocVerify for more information.',
  '-191': 'ID Verify or KBA is not permitted.',
  '-192': 'Not enough ID Verify credits. Please contact sales@docverify.com to purchase more.',
  '-193': 'This edition does not allow signature placements. Either set it to False or contact sales@docverify.com to upgrade.',
  '-194': 'Child account either doesn\'t exist or belong to the parent.',
  '-195': 'The Wufoo form checkbox Include Field and Form Structures with Entry Data is not checked.',
  '-200': 'E-Notary information is missing. Please make sure all required data is provided.',
  '-201': 'The notary ID provided is invalid. Please make sure the ID is exactly the same as the one provided with the E-Notary List method.',
  '-202': 'Phone number provided is invalid. Please make sure it is all numeric with no symbols such as hyphens.',
  '-203': 'The notary was not found.',
  '-204': 'Notary commission is expired. Please either update this by contacting support or notify the notary their commission has expired',
  '-205': 'No notaries were found.',
  '-206': 'Notaries are not permitted to send requests to themselves or notary was not found.',
  '-207': 'Notary is not permitted to perform e-notarizations.',
  '-208': 'Edition does not permit e-journals. Please upgrade to another edition.',
  '-209': 'The notary\'s username and password is required.',
  '-210': 'The notary\'s provided username and/or password is not valid. Please make sure they are both correct.',
  '-211': 'The vendor and notary credentials cannot be the same account. Please provide the credentials of another notary.',
  '-212': 'The notary\'s commission has expired. Please have them update their commission expiration if they have extended their commission with DocVerify.',
  '-213': 'The notary\'s commission has been suspended or revoked by the state or DocVerify.',
  '-214': 'The notary is not permitted to do e-notarizations. If they are in a state that permits them have the notary activate themselves with DocVerify as an e-notary.',
  '-215': 'The state of CO requires a unique Document Identification Number (DAN), which was not provided.',
  '-216': 'Out of Delaware credits. The state of DE requires a fee for each submitted e-notarization. Please contact sales@docverify.com to purchase more credits.',
  '-217': 'The ID type and the ID number are required.',
  '-218': 'Out of ID Verify credits. Each participant requires one ID Verify credit for authentication using KBA. Please contact sales@docverify.com to purchase more credits.',
  '-219': 'Account is not permitted to make Remote Notary Requests. This method requires special permission, and is not available to all users. Contact sales@docverify.com for info.',
  '-220': 'Out of Remote Notary Request credits. Please contact sales@docverify.com to purchase more credits.',
  '-221': 'Not all of the required property values for the notary participant were provided. Please make sure you\'re including all of the required values.',
  '-222': 'The account is not permitted to attach a packet. Please upgrade the the edition.',
  '-223': 'The account is not permitted to do remote notarizations. Please upgrade the edition.',
  '-224': 'All images required. Front license, back license, and face pic respectively depending on the method being accessed.',
  '-225': 'This account is not permitted to access this system. Please contact DocVerify sales.',
  '-301': 'Template ID is missing or not valid',
  '-302': 'Template document is missing. Please make sure it is included, and it\'s a PDF.',
  '-303': 'Template Name is missing or not valid.',
  '-304': 'Template record not found.',
  '-305': 'Number of allowable templates has been exceeded.',
  '-306': 'Template has exceeded the allowable size of 1024000 bytes.',
  '-307': 'Template is password protected. Please remove passwords from the PDF, and try again.',
  '-308': 'Template uploaded is either corrupt or not a PDF.',
  '-999': 'Deprecated'
}

export default class DocVerifyClient {
  constructor (apiKey, apiSig) {
    if (!apiKey) {
      throw new Error('Invalid API key')
    } else if (!apiSig) {
      throw new Error('Invalid API signature')
    } else {
      this.url = 'https://api.docverify.com/V2/?wsdl'
      this.apiKey = apiKey
      this.apiSig = apiSig
    }
  }

  /**
   * Add new document to ESign. And notify specific Emails about signing the document.
   * @param {Base64Binary} Document base64binary of document to be added.
   * @param {Number} creditType 1 for Document Credits, 2 for PrePaid Credits, 3 for Subscription Accounts.
   * @param {String} DocumentName Document name of the document being added.
   * @param {String} Description Description for the document being added. Can be empty.
   * @param {String} ClientID Client ID for the document being added. Can be empty.
   * @param {String} Emails Emails to have E-Sign this document. Emails must be semi-colon delimited.
   * @param {String} MessageToSigners This is the message that will be included in the sign emails sent to the signers. Can be empty.
   * @param {Boolean} ReqOwnerESign Request to also E-Sign this document.
   * @param {Boolean} OwnerESignFirst Request to E-Sign this document first.
   * @param {String} SecretWord Secret Word to protect this document for E-Signing. Can be empty.
   * @param {Boolean} RequireSecurityEnhanced Require each signer to have at least a free DocVerify account.
   * @param {Boolean} RequestPhoneVerify Phone verification and voice recording of each signer excluding signature requestor. Phone credits required.
   * @param {String} XMLData Include XML data with your PDF form document. The XML will be merged with PDF by DocVerify.
   * @param {Boolean} DetectFields Detect Fields will automatically detect all non-SmartTags PDF text fields in the document.
   * @param {String} ElementsFromTemplateID Template ID of the DocVerify Library document.
   * @returns {String} DocVerifyID of the added document.
   */
  AddNewDocumentESign ({
    Document = '',
    creditType = 3,
    DocumentName = '',
    Description = '',
    ClientID = '',
    Emails = '',
    MessageToSigners = '',
    ReqOwnerESign = false,
    OwnerESignFirst = false,
    SecretWord = '',
    RequireSecurityEnhanced = false,
    RequestPhoneVerify = false,
    XMLData = '',
    DetectFields = false,
    ElementsFromTemplateID = ''
  }) {
    if (!Document) {
      throw new Error('field Document is empty')
    } else if (!DocumentName) {
      throw new Error('field DocumentName is empty')
    } else if (!Emails) {
      throw new Error('field Emails is empty')
    }

    const args = {
      apiKey: this.apiKey,
      apiSig: this.apiSig,
      Document,
      creditType,
      DocumentName,
      Description,
      ClientID,
      Emails,
      MessageToSigners,
      ReqOwnerESign,
      OwnerESignFirst,
      SecretWord,
      RequireSecurityEnhanced,
      RequestPhoneVerify,
      XMLData,
      DetectFields,
      ElementsFromTemplateID
    }

    return new Promise((resolve, reject) => {
      const url = 'https://api.docverify.com/V3/?wsdl'
      soap.createClient(url, (err, client) => {
        if (err) {
          reject(new Error(err))
        }

        client.AddNewDocumentESign(args, (err, result) => {
          if (err) {
            reject(new Error(err))
          }

          const { AddNewDocumentESignResult } = result
          if (returnCodes[AddNewDocumentESignResult]) {
            reject(new Error(returnCodes[AddNewDocumentESignResult] || 'AddNewDocumentESign failed'))
          } else {
            resolve(AddNewDocumentESignResult)
          }
        })
      })
    })
  }

  /**
   * Cancel ESign of a specific document
   * @param {String} DocVerifyID ID of the document.
   * @returns {String} Not Found/Succes/Already Canceled
   */
  CancelESign (DocVerifyID = '') {
    if (!DocVerifyID) {
      throw new Error('field DocVerifyID is empty')
    }

    const args = { apiKey: this.apiKey, apiSig: this.apiSig, DocVerifyID }

    return new Promise((resolve, reject) => {
      soap.createClient(this.url, (err, client) => {
        if (err) {
          reject(new Error(err))
        }

        client.CancelESign(args, (err, result) => {
          if (err) {
            reject(new Error(err))
          }

          const { CancelESignResult } = result
          if (returnCodes[CancelESignResult]) {
            reject(new Error(returnCodes[CancelESignResult] || 'CancelESign failed'))
          } else {
            resolve(CancelESignResult)
          }
        })
      })
    })
  }

  /**
   * Get document status
   * @param {String} DocVerifyID ID of the document.
   * @returns {String} Not Found/Invalid Document - (Document could not be processed)/Processing/Completed - (Document is ready to be viewed or downloaded)
   */
  GetDocumentStatus (DocVerifyID = '') {
    if (!DocVerifyID) {
      throw new Error('field DocVerifyID is empty')
    }

    const args = { apiKey: this.apiKey, apiSig: this.apiSig, DocVerifyID }

    return new Promise((resolve, reject) => {
      soap.createClient(this.url, (err, client) => {
        if (err) {
          reject(new Error(err))
        }

        client.GetDocumentStatus(args, (err, result) => {
          if (err) {
            reject(new Error(err))
          }

          const { GetDocumentStatusResult } = result
          if (returnCodes[GetDocumentStatusResult]) {
            reject(new Error(returnCodes[GetDocumentStatusResult] || 'GetDocumentStatus failed'))
          } else {
            resolve(GetDocumentStatusResult)
          }
        })
      })
    })
  }

    /**
   * Get document details
   * @param {String} DocVerifyID ID of the document.
   * @returns {String} JSON object of document details
   */
  GetDocumentDetailsJSON (DocVerifyID = '') {
    if (!DocVerifyID) {
      throw new Error("field DocVerifyID is empty")
    }
    
    const args = { apiKey: this.apiKey, apiSig: this.apiSig, DocVerifyID }

    return new Promise ((resolve, reject) => {
      soap.createClient(this.url, (err, client) => {
        if (err) {
          reject(new Error(err))
        }

        client.GetDocumentDetailsJSON(args, (err, result) => {
          if (err) {
            reject(new Error(err))
          }

          const { GetDocumentDetailsJSONResult } = result
          if(returnCodes[GetDocumentDetailsJSONResult]) {
            reject(new Error(returnCodes[GetDocumentDetailsJSONResult] || 'GetDocumentDetailsJSON failed'))
          } else {
            resolve(GetDocumentDetailsJSONResult)
          }
        })
      })
    })
  }

  /**
   * Downloads the document as base64binary
   * @param {String} DocVerifyID ID of the document.
   * @returns {Base64Binary} Encoded document.
   */
  GetDocument (DocVerifyID = '') {
    if (!DocVerifyID) {
      throw new Error('field DocVerifyID is empty')
    }
    
    const args = { apiKey: this.apiKey, apiSig: this.apiSig, DocVerifyID }

    return new Promise ((resolve, reject) => {
      soap.createClient(this.url, (err, client) => {
        if (err) {
          reject(new Error(err))
        }

        client.GetDocument(args, (err, result) => {
          if (err) {
            reject(new Error(err))
          }

          if (!result) {
            reject(new Error('GetDocument failed - no result'))
          } else {
            const { GetDocumentResult } = result
            if(returnCodes[GetDocumentResult]) {
              reject(new Error(returnCodes[GetDocumentResult] || 'GetDocument failed'))
            } else {
              resolve(GetDocumentResult)
            }
          }
        })
      })
    })
  }

  /**
   * Get document signature status
   * @param {String} DocVerifyID ID of the document.
   * @returns {String} Not Found/Invalid Document - (Document could not be processed)/Not Complete - (Still out to be signed)/Cancelled - (Document owner has cancelled E-Sign request)/
   */
  GetSignatureStatus (DocVerifyID = '') {
    if (!DocVerifyID) {
      throw new Error('field DocVerifyID is empty')
    }

    const args = { apiKey: this.apiKey, apiSig: this.apiSig, DocVerifyID }

    return new Promise((resolve, reject) => {
      soap.createClient(this.url, (err, client) => {
        if (err) {
          reject(new Error(err))
        }

        client.GetSignatureStatus(args, (err, result) => {
          if (err) {
            reject(new Error(err))
          }

          const { GetSignatureStatusResult } = result
          if (returnCodes[GetSignatureStatusResult]) {
            reject(new Error(returnCodes[GetSignatureStatusResult] || 'GetSignatureStatus failed'))
          } else {
            resolve(GetSignatureStatusResult)
          }
        })
      })
    })
  }

  /**
   * Get list of documents not yet signed or signed documents.
   * @param {Number} ListType 1 for documents Out to be Signed. Only active documents from the last 45 days are listed.
   *                          2 for Signed documents. Only the last 100 documents are listed.
   * @returns {JSON} List of documents.
   */
  GetESignListID ({ ListType = 1 }) {
    if (!ListType) {
      throw new Error('field ListType is empty')
    }

    const args = { apiKey: this.apiKey, apiSig: this.apiSig, ListType: ListType }

    return new Promise((resolve, reject) => {
      soap.createClient(this.url, (err, client) => {
        if (err) {
          reject(new Error(err))
        }

        client.GetESignListID(args, (err, result) => {
          if (err) {
            reject(new Error(err))
          }

          const { GetESignListIDResult } = result
          if (returnCodes[GetESignListIDResult]) {
            reject(new Error(returnCodes[GetESignListIDResult] || 'GetESignListID failed'))
          } else {
            resolve(JSON.parse(GetESignListIDResult))
          }
        })
      })
    })
  }
}
