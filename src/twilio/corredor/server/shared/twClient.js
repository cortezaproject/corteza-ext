import Twilio from 'twilio'

/**
 * twClient function initializes the Twilio client based on the provided Twilio configuration.
 * It supports production and test credentials (limitations apply!).
 * @param {Object} ComposeAPI Compose API client
 * @returns {Promise<Twilio>} Initialized twilio API client
 */
export default async function (Compose, testCredentials = false) {
  const config = await Compose.findFirstRecord('ext_twilio_configuration')
  if (testCredentials) {
    return new Twilio(config.values.TestingSID, config.values.TestingToken)
  } else {
    return new Twilio(config.values.ProductionSID, config.values.ProductionToken)
  }
}
