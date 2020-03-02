import twClient from '../shared/twClient'

export default {
  label: 'Call Center Teardown',
  description:
`This automation script handles operations related to call center removal.
It removes call center related metadata from the given Twilio phone number and marks it as 'Unconfigured'.
It does **not** release the actual phone number it self -- if this is needed, do it manually or extend this automation script`,
  triggers (t) {
    return [
      t.before('delete')
        .for('compose:record')
        .where('module', ['ext_twilio_call_center']),
    ]
  },

  async exec ({ $oldRecord }, { Compose }) {
    const twilio = await twClient(Compose)

    await twilio.incomingPhoneNumbers($oldRecord.values.PhoneNumberSid)
      .update({
        friendlyName: 'Unconfigured',
        voiceUrl: '',
      })
  },
}
