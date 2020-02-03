import { parseBody } from '../shared/lib'

export default {
  label: 'Call Logging',
  description:
`This automation script handles call logging.
It logs basic call metadata such as duration, phone numbers, references and agent's interactions.`,
  security: {
    // @todo...
    runAs: 'tomaz.jerman@kendu.si',
  },
  triggers (t) {
    return [
      t.on('request')
        .where('request.path', '/ext_twilio/call/log')
        // @todo change to GET
        .where('request.method', 'POST')
        .for('system:sink'),
    ]
  },

  async exec ({ request, response }, { Compose }) {
    response.status = 200
    parseBody(request)

    const ns = await Compose.resolveNamespace(request.query.ns[0])
    const modCall = await Compose.findModuleByHandle('ext_twilio_call', ns)
    const modInt = await Compose.findModuleByHandle('ext_twilio_interaction', ns)

    // create a call instance and log call metadata
    const log = await Compose.makeRecord({
      Recording: request.body.recording,
      Duration: sToHMS(request.body.durationRaw || 0),
      DurationRaw: request.body.durationRaw || 0,
      CallType: request.body.callType,
      Contact: request.body.Contact,
      Lead: request.body.Lead,
      CallCenter: request.body.CallCenter,
      PhoneNumberFrom: request.body.phoneNumberFrom,
      PhoneNumberTo: request.body.phoneNumberTo,
      CallSid: request.body.callSid,
    }, modCall)
    .then(r => {
      r.namespaceID = r.module.namespaceID
      r.moduleID = r.module.moduleID
      return Compose.saveRecord(r)
    })

    // create interactions for the given script
    for (const i of request.body.interaction || []) {
      await Compose.makeRecord({
        Scene: i.sceneID,
        Answer: i.answer,
        Call: log.recordID,
      }, modInt)
      .then(r => {
        r.namespaceID = r.module.namespaceID
        r.moduleID = r.module.moduleID
        return Compose.saveRecord(r)
      })
    }

    return response
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
