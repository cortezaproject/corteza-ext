import axios from 'axios'

/**
 * APIClient class provides an interface for Corteza API.
 *
 * It provides logging, call enrichment, ...
 */
export default class APIClient {
  constructor ({ baseURL, sign } = {}) {
    this.baseURL = baseURL
    this.sign = sign

    this.headers = {
      'Content-Type': 'application/json',
    }
  }

  stdReject (reject) {
    return (error) => {
      reject(error)
    }
  }

  stdResolve (resolve, reject) {
    return (response) => {
      if (response.data.error) {
        reject(response.data.error)
      } else {
        resolve(response.data)
      }
    }
  }

  api () {
    return axios.create({
      baseURL: this.baseURL,
      headers: this.headers,
    })
  }

  /**
   * authCapability method generates capability tokens for the given user
   * @param {String} userID User's ID
   * @param {String} ns Relevant namespace
   * @returns {Promise<*>}
   */
  async authCapability ({ userID, ns } = {}) {
    const cfg = {
      method: 'post',
      url: `${this.baseURL}auth/capability?__sign=${this.sign}`,
      data: {
        userID,
        ns,
      },
    }
    return new Promise((resolve, reject) => {
      this.api().request(cfg).then(this.stdResolve(resolve, reject), this.stdReject(reject))
    })
  }

  /**
   * authWorker method generates worker tokens for the given user
   * @param {String} userID User's ID
   * @param {String} workerID Specific worker's ID to generate
   * @param {String} ns Relevant namespace
   * @returns {Promise<*>}
   */
  async authWorker ({ userID, workerID, ns } = {}) {
    const cfg = {
      method: 'post',
      url: `${this.baseURL}auth/worker?__sign=${this.sign}`,
      data: {
        userID,
        workerID,
        ns,
      },
    }
    return new Promise((resolve, reject) => {
      this.api().request(cfg).then(this.stdResolve(resolve, reject), this.stdReject(reject))
    })
  }

  /**
   * logCall method creates a call log
   * @param {Object} call Call object
   * @param {String} ns Relevant namespace
   * @param {Object} script Script object
   * @returns {Promise<*>}
   */
  async logCall (call, ns, script) {
    console.log({ call, ns, script })
    const cfg = {
      method: 'post',
      url: `${this.baseURL}call/log?__sign=${this.sign}`,
      data: {
        callSid: call.callSid,
        from: call.from,
        to: call.to,
        callType: call.kind,
        callStatus: call.state,
        callCenterID: call.callCenterID,
        ns,
        script,
      },
    }

    const d = call.details
    if (d.caller) {
      cfg.data.Caller = d.caller.id
    }
    if (d.contact) {
      cfg.data.Contact = d.contact.id
    }
    if (d.lead) {
      cfg.data.Lead = d.lead.id
    }

    return new Promise((resolve, reject) => {
      this.api().request(cfg).then(this.stdResolve(resolve, reject), this.stdReject(reject))
    })
  }

  /**
   * workerCallerIDs method provides available callerIDs for the given user
   * @param {String} userID Relevant user
   * @param {String} ns Relevant namespace
   * @returns {Promise<*>}
   */
  async workerCallerIDs ({ userID, ns } = {}) {
    const cfg = {
      method: 'post',
      url: `${this.baseURL}worker/caller-id?__sign=${this.sign}`,
      data: {
        ns,
        userID,
      },
    }
    return new Promise((resolve, reject) => {
      this.api().request(cfg).then(this.stdResolve(resolve, reject), this.stdReject(reject))
    })
  }

  /**
   * callInfo method provides detailed information about the call
   * @param {String} phoneNumber Relevant phone number
   * @param {String} ns Relevant namespace
   * @returns {Promise<*>}
   */
  async callInfo ({ phoneNumber, ns } = {}) {
    const cfg = {
      method: 'post',
      url: `${this.baseURL}call/enrich?__sign=${this.sign}`,
      data: {
        ns,
        phoneNumber,
      },
    }
    return new Promise((resolve, reject) => {
      this.api().request(cfg).then(this.stdResolve(resolve, reject), this.stdReject(reject))
    })
  }

  /**
   * callScript method provides a call script for the given phone number
   * @param {String} phoneNumber Relevant phone number
   * @param {String} ns Relevant namespace
   * @returns {Promise<*>}
   */
  async callScript ({ phoneNumber, ns } = {}) {
    const cfg = {
      method: 'post',
      url: `${this.baseURL}call/script?__sign=${this.sign}`,
      data: {
        ns,
        phoneNumber,
      },
    }
    return new Promise((resolve, reject) => {
      this.api().request(cfg).then(this.stdResolve(resolve, reject), this.stdReject(reject))
    })
  }
}
