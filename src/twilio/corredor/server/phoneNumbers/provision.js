import twClient from '../shared/twClient'

export default {
  label: 'Phone Number Provisioning',
  description:
`This automation script provides Twilio Phone Number provisioning.
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
      phoneNumber: '@todo'
    }

    // Provision the phone number
    return twilio.incomingPhoneNumbers
      .create(params)
  },
}
