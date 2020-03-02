import { parseBody } from '../shared/lib'

export const pn = {
  label: 'Phone Number Information',
  description:
`This automation script provides data enrichment for a given phone number.
It attempts to find a record within compose based on the Twilio Configuration settings (see ext_twilio_configuration.CallEnrichmentSource docs).`,
  security: {
    // @todo...
    runAs: 'tomaz.jerman@kendu.si',
  },
  triggers (t) {
    return [
      t.on('request')
        .where('request.path', '/ext_twilio/call/enrich')
        // @todo change to GET
        .where('request.method', 'POST')
        .for('system:sink'),
    ]
  },

  async exec ({ $request, $response }, { Compose }) {
    const body = parseBody($request)
    $response.status = 200
    $response.header = { 'Content-Type': ['application/json'] }

    let enriched
    const ns = await Compose.resolveNamespace(body.ns)

    const modules = [
      { handle: 'contact', mapTo: 'contact' },
      { handle: 'lead', mapTo: 'lead' },
      { handle: 'ext_twilio_caller', mapTo: 'caller' },
    ]

    // find details about the phone number
    const rtr = {
      phoneNumber: body.phoneNumber,
    }
    for (const { handle, mapTo } of modules) {
      const mod = await Compose.findModuleByHandle(handle, ns)
      enriched = await Compose.findRecords(`PhoneNumber = '${body.phoneNumber}'`, mod)
        .then(({ set }) => {
          return (set || [])[0]
        })
        .catch(() => {})
      if (enriched) {
        const { toJSON, ...values } = enriched.values
        rtr[mapTo] = {
          id: enriched.recordID,
          values,
        }
      }
    }

    // payload
    $response.body = JSON.stringify(rtr)
    return $response
  },
}

export const scr = {
  label: 'Agent Scripts',
  description: `This automation script provides agent scripts defined by the Call Center.`,
  security: {
    // @todo...
    runAs: 'tomaz.jerman@kendu.si',
  },
  triggers (t) {
    return [
      t.on('request')
        .where('request.path', '/ext_twilio/call/script')
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
    const modScript = await Compose.findModuleByHandle('ext_twilio_script', ns)
    const modScriptScene = await Compose.findModuleByHandle('ext_twilio_script_scene', ns)
    const modCallCenter = await Compose.findModuleByHandle('ext_twilio_call_center', ns)

    const { set: [cc] } = await Compose.findRecords(`PhoneNumber = '${body.phoneNumber}'`, modCallCenter)
    if (!cc) {
      $response.body = '{"scripts":[]}'
      return $response
    }

    // Find scripts for the given call center
    const scripts = []
    const { set: scriptsRaw } = await Compose.findRecords(`CallCenter = '${cc.recordID}'`, modScript)
    for (const s of scriptsRaw) {
      const { set: scenesRaw } = await Compose.findRecords({ filter: `Script = '${s.recordID}'`, sort: 'Order ASC,createdAt ASC', perPage: 0 }, modScriptScene)
      scripts.push({
        script: {
          scriptID: s.recordID,
          callCenterID: cc.recordID,
          name: s.values.Name,
        },
        scenes: scenesRaw.map(({ recordID: sceneID, values: { Type: type, Text: text, Order: order } }) => ({ sceneID, type, text, order })),
      })
    }

    $response.body = JSON.stringify({
      scripts,
    })
    return $response
  },
}
