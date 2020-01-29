export default {
  label: 'Call Logging',
  description:
`This automation script handles call logging.
It logs basic call metadata such as duration, phone numbers, references and agent's interactions.`,
  triggers (t) {
    return [
      // @todo .on('request')
    ]
  },

  async exec (args, { Compose }) {
    // @todo get from request
    const params = {
      interaction: [
        { sceneID: '@todo', answer: '@todo' },
      ],
      recording: '@todo',
      durationRaw: 0,
      callType: 'Inbound',
      CallCenter: '@todo',
      phoneNumberFrom: '@todo',
      phoneNumberTo: '@todo',
      callSid: '@todo',
    }

    // create a call instance and log call metadata
    const log = await Compose.makeRecord({
      Recording: params.recording,
      Duration: sToHMS(params.durationRaw),
      DurationRaw: params.durationRaw,
      CallType: params.callType,
      Contact: params.Contact,
      Lead: params.Lead,
      CallCenter: params.CallCenter,
      PhoneNumberFrom: params.phoneNumberFrom,
      PhoneNumberTo: params.phoneNumberTo,
      CallSid: params.callSid,
    }, 'ext_twilio_call')
    .then(r => {
      r.namespaceID = r.module.namespaceID
      r.moduleID = r.module.moduleID
      return Compose.saveRecord(r)
    })

    // create interactions for the given script
    for (const i of params.interaction) {
      await Compose.makeRecord({
        Scene: i.sceneID,
        Answer: i.answer,
        Call: log.recordID,
      }, 'ext_twilio_interaction')
      .then(r => {
        r.namespaceID = r.module.namespaceID
        r.moduleID = r.module.moduleID
        return Compose.saveRecord(r)
      })
    }
  },
}

/**
 * sToHMS function converts the given number of seconds into a Hh Mmin Ss format.
 * @example: 65 -> 1min 5s
 * @example: 120 -> 2min
 * @param {Number} sec Duration in seconds
 */
function sToHMS (sec) {
  let h, m, s

  // calculate (and subtract) whole hours
  h = Math.floor(sec / 3600) % 24
  sec -= h * 3600

  // calculate (and subtract) whole minutes
  m = Math.floor(sec / 60) % 60
  sec -= m * 60

  // what's left is seconds
  s = sec % 60

  let rtr = ''
  if (h) {
    rtr += `${h}h `
  }
  if (m) {
    rtr += `${m}min `
  }
  if (s) {
    rtr += `${s}s `
  }
  return rtr.trim()
}
