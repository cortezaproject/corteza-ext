import twClient from '../shared/twClient'

export default {
  label: 'Phone Number Provisioning',
  description:
`This automation script provides Twilio Phone Number provisioning.
This automation script can be used to implement on-the-fly phone number provisioning.`,
  security: {
    // @todo...
    runAs: 'tomaz.jerman@kendu.si',
  },
  triggers (t) {
    return [
      t.on('request')
        .where('request.path', '/ext_twilio/number/provision')
        // @todo change to GET
        .where('request.method', 'POST')
        .for('system:sink'),
    ]
  },

  async exec ({ $request, $response }, { Compose }) {
    $response.status = 200
    $response.header = { 'Content-Type': ['application/json'] }

    const ns = await Compose.resolveNamespace($request.query.ns[0])
    const modConfig = await Compose.findModuleByHandle('ext_twilio_configuration', ns)
    const twilio = await twClient(Compose, false, modConfig)

    // Provision the phone number
    $response.body = await twilio.incomingPhoneNumbers
      .create($request.query.phoneNumber[0])

    return $response
  },
}
