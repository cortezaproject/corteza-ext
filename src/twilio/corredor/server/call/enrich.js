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

  async exec ({ request, response }, { Compose }) {
    response.status = 200
    response.header = { 'Content-Type': ['application/json'] }

    let enriched
    const ns = await Compose.resolveNamespace(request.query.ns[0])
    const modConfig = await Compose.findModuleByHandle('ext_twilio_configuration', ns)
    const config = await Compose.findFirstRecord(modConfig)

    // find details about the phone number
    for (const s of config.values.CallEnrichmentSource) {
      if (!s) {
        continue
      }

      const [, source, name, field] = /(\w+): (\w+)(?:\[)?(\w+)?(?:\])?/.exec(s)
      switch (source) {
        case 'module':
          const mod = await Compose.findModuleByHandle(name, ns)
          enriched = await enrichFromModule(Compose, mod, request.query.phoneNumber[0], field)
            .catch(() => undefined)
      }

      if (enriched) {
        break
      }
    }

    // payload
    if (!enriched) {
      response.body = undefined
      response.status = 400
    } else {
      response.body = {
        name: enriched.Name,
        email: enriched.Email,
        organisation: enriched.Organisation,
      }
    }

    console.log({ response })
    return response
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

  async exec ({ request, response }, { Compose }) {
    response.status = 200

    const ns = await Compose.resolveNamespace(request.query.ns[0])
    const modScript = await Compose.findModuleByHandle('ext_twilio_script', ns)
    const modScriptScene = await Compose.findModuleByHandle('ext_twilio_script_scene', ns)

    // Find scripts for the given call center
    let scripts = []
    const { set: scriptsRaw } = await Compose.findRecords(`CallCenter = '${request.query.callCenterID[0]}'`, modScript)
    for (const s of scriptsRaw) {
      const { set: scenesRaw } = await Compose.findRecords({ filter: `Script = '${s.recordID}'`, sort: 'Order ASC,createdAt ASC', perPage: 0 }, modScriptScene)
      scripts.push({
        script: {
          scriptID: s.recordID,
          name: s.values.Name,
        },
        scenes: scenesRaw.map(({ recordID: sceneID, values: { Type: type, Text: text, Order: order } }) => ({ sceneID, type, text, order }))
      })
    }

    response.body = {
      scripts,
    }
    return response
  },
}

/**
 * enrichFromModule function attempts to find a record for the given module.
 * If a record is found it's value is returned, else the promise rejects.
 * @param {ComposeAPI} client ComposeAPI client
 * @param {String} module Module handle that should be used
 * @param {String} query Queried value
 * @param {String} field Field name; defaults to 'PhoneNumber'
 * @returns {Promise<Object>}
 */
async function enrichFromModule (client, module, query, field = 'PhoneNumber') {
  return await client.findRecords(`${field} = '${query}'`, module)
    .then(({ set }) => {
      if (set && set.length) {
        return set[0].values
      }
      throw new Error('resolve.failed')
    })
}
