import { parseBody } from '../shared/lib'
import twClient from '../shared/twClient'

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

  async exec ({ $request, $response }, { Compose }) {
    const body = parseBody($request)
    $response.status = 200
    $response.header = { 'Content-Type': ['application/json'] }

    const ns = await Compose.resolveNamespace(body.ns)
    const modCall = await Compose.findModuleByHandle('ext_twilio_call', ns)
    const modInt = await Compose.findModuleByHandle('ext_twilio_interaction', ns)

    // get call from Twilio
    const modConfig = await Compose.findModuleByHandle('ext_twilio_configuration', ns)
    const twilio = await twClient(Compose, false, modConfig)

    const call = await twilio.calls(body.callSid)
      .fetch()

    const [recording] = await twilio.recordings
      .list({ callSid: call.sid, limit: 1 })

    // create a call instance and log call metadata
    const rr = {
      Duration: sToHMS(parseInt(call.duration) || 0),
      DurationRaw: call.duration || '0',
      CallType: body.callType,
      Contact: body.Contact,
      Caller: body.Caller,
      Lead: body.Lead,
      CallCenter: body.callCenterID,
      PhoneNumberFrom: body.from,
      PhoneNumberTo: body.to,
      CallSid: call.sid,
    }

    if (recording) {
      rr.Recording = recording.sid
    }
    const log = await Compose.makeRecord(rr, modCall)
      .then(r => {
        r.namespaceID = r.module.namespaceID
        r.moduleID = r.module.moduleID
        return Compose.saveRecord(r)
      })

    // create interactions for the given script
    if (body.script) {
      for (const i of body.script.interaction) {
        await Compose.makeRecord({
          Scene: i.sceneID,
          Answer: i.answer,
          Call: log.recordID,
          Script: body.script.meta.scriptID,
        }, modInt)
          .then(r => {
            r.namespaceID = r.module.namespaceID
            r.moduleID = r.module.moduleID
            return Compose.saveRecord(r)
          })
      }
    }

    return $response
  },
}

/**
 * sToHMS function converts the given number of seconds into a Hh Mmin Ss format.
 * @example: 65 -> 1min 5s
 * @example: 120 -> 2min
 * @param {Number} sec Duration in seconds
 */
function sToHMS (sec) {
  // calculate (and subtract) whole hours
  const h = Math.floor(sec / 3600) % 24
  sec -= h * 3600

  // calculate (and subtract) whole minutes
  const m = Math.floor(sec / 60) % 60
  sec -= m * 60

  // what's left is seconds
  const s = sec % 60

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
