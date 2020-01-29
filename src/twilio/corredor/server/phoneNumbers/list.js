import twClient from '../shared/twClient'

export default {
  label: 'Phone Number Listing',
  description:
`This automation script provides a list of available Twilio phone numbers that comply with the provided filter.
This automation script can be used to implement on-the-fly phone number provisioning.`,
  triggers (t) {
    return [
      // @todo... .on('request')
    ]
  },

  async exec (args, { Compose }) {
    const twilio = await twClient(Compose)

    // @todo get from request
    const params = {
      countryCode: '@todo',
      areaCode: undefined,
      excludeAllAddressRequired: true,
    }

    // find available phone numbers and create a nice structure
    return twilio.availablePhoneNumbers(params.countryCode)
      .local
      .list({
        ...params,
        voiceEnabled: true,
        limit: 20,
      })
      .then(numbers => numbers.map(({ friendlyName, phoneNumber, isoCountry, locality, sid }) => ({ friendlyName, phoneNumber, isoCountry, locality, sid })))
  },
}
