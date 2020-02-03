import twClient from '../shared/twClient'

export default {
  label: 'Phone Number Listing',
  description:
`This automation script provides a list of available Twilio phone numbers that comply with the provided filter.
This automation script can be used to implement on-the-fly phone number provisioning.`,
  security: {
    // @todo...
    runAs: 'tomaz.jerman@kendu.si',
  },
  triggers (t) {
    return [
      t.on('request')
        .where('request.path', '/ext_twilio/number/list')
        // @todo change to GET
        .where('request.method', 'POST')
        .for('system:sink'),
    ]
  },

  async exec ({ request, response }, { Compose }) {
    response.status = 200
    const ns = await Compose.resolveNamespace(request.query.ns[0])
    const modConfig = await Compose.findModuleByHandle('ext_twilio_configuration', ns)
    const twilio = await twClient(Compose, false, modConfig)

    // @todo get from request
    const params = {
      areaCode: request.query.area_code[0],
      excludeAllAddressRequired: request.query.no_address[0],
    }

    // find available phone numbers and create a nice structure
    response.body = await twilio.availablePhoneNumbers(request.query.country_code[0])
      .local
      .list({
        ...params,
        voiceEnabled: true,
        limit: 20,
      })
      .then(numbers => numbers.map(({ friendlyName, phoneNumber, isoCountry, locality }) => ({ friendlyName, phoneNumber, isoCountry, locality })))

    return response
  },
}
