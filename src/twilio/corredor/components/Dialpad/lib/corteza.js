/**
 * Corteza class provides an interface for Corteza API.
 *
 * The class handles API comm. with Corteza services and assures correct
 * response payloads.
 */
export default class Corteza {
  constructor (token) {
    // Corteza JWT token
    this.token = token

    // @todo... init clients
    this.composeClient = undefined
  }

  /**
   * API interface
   * ----------------------------------------------------------------------
   */

  /**
   * logCall creates a log entry for the given call
   * @todo implement
   * @param {Object} call The call to log
   */
  async logCall (call) {
    return call
  }

  /**
   * fetchCallerInfo attempts to create a detailed report on who is calling.
   * @param {Object} call Call to enrich
   * @returns {Promise<Object>} An object describing the caller
   */
  async fetchCallerInfo (call) {
    const [contact, callCenter] = await Promise.all([
      this.enrichContact(call),
      this.enrichCallCenter(call),
    ])
    return { contact, callCenter, call }
  }

  /**
   * fetchCallerIDs provides a list of available callerIDs for the given user
   * @todo implement
   * @param {Object} user Current user
   * @returns {Promise<Array<Object>>}
   */
  async fetchCallerIDs (user) {
    return []
  }

  /**
   * fetchScript attempts to find scripts related to the call center
   * @todo implement
   * @param {String} callCenterID Relevant call center
   * @returns {Promise<Array<Object>>}
   */
  async fetchScript (callCenterID) {
    return []
  }

  /**
   * completeScript completes and stores the script inside Compose
   * @todo implement
   * @param {String} callCenterID Relevant call center
   * @param {Array<Object>} script Array of question objects
   * @returns {Promise<Array<Object>>}
   */
  async completeScript (callCenterID, script) {
    return script
  }

  /**
   * Internal methods
   * ----------------------------------------------------------------------
   */

  /**
   * enrichContent attempts to find a contact or lead record inside Compose.
   * If there is no entry, it returns undefined
   * @todo implement
   * @param {Object} call Call to enrich
   * @returns {Promise<Object|undefined>}
   */
  async enrichContact (call) {
    return undefined
  }

  /**
   * enrichCallCenter attempts to find the called call center record inside Compose.
   * If there is no entry, it returns undefined
   * @todo implement
   * @param {Object} call Call to enrich
   * @returns {Promise<Object|undefined>}
   */
  async enrichCallCenter (call) {
    return undefined
  }
}
