export const pn = {
  label: 'Phone Number Information',
  description:
`This automation script provides data enrichment for a given phone number.
It attempts to find a record within compose based on the Twilio Configuration settings (see ext_twilio_configuration.CallEnrichmentSource docs).`,
  triggers (t) {
    return [
      // @todo .on('request')
    ]
  },

  async exec (args, { Compose }) {
    // @todo get from request
    const params = {
      phoneNumber: '@todo',
    }

    let enriched
    const config = await Compose.findFirstRecord('ext_twilio_configuration')

    // find details about the phone number
    for (const s of config.values.CallEnrichmentSource) {
      if (!s) {
        continue
      }

      const [, source, name, field] = /(\w+): (\w+)(?:\[)?(\w+)?(?:\])?/.exec(s)
      switch (source) {
        case 'module':
          enriched = await enrichFromModule(Compose, name, params.phoneNumber, field)
            .catch(() => undefined)
      }

      if (enriched) {
        break
      }
    }

    // payload
    enriched = (enriched || params)
    return {
      name: enriched.Name,
      email: enriched.Email,
      organisation: enriched.Organisation,
    }
  },
}

export default {
  label: 'Agent Scripts',
  description: `This automation script provides agent scripts defined by the Call Center.`,
  triggers (t) {
    return [
      // @todo .on('request')
    ]
  },

  async exec (args, { Compose }) {
    // @todo get from request
    const params = {
      phoneNumber: '@todo',
    }

    let enriched
    const config = await Compose.findFirstRecord('ext_twilio_configuration')

    const { set: [ callCenter ] } = await Compose.findRecords(`PhoneNumber = '${params.phoneNumber}'`, 'ext_twilio_call_center')
    if (!callCenter) {
      return undefined
    }

    // Find scripts for the given call center
    let scripts = []
    const { set: scriptsRaw } = await Compose.findRecords(`CallCenter = '${callCenter.recordID}'`, 'ext_twilio_script')
    for (const s of scriptsRaw) {
      const { set: scenesRaw } = await Compose.findRecords({ filter: `Script = '${s.recordID}'`, sort: 'Order ASC,createdAt ASC', perPage: 0 }, 'ext_twilio_script_scene')
      scripts.push({
        script: {
          scriptID: s.recordID,
          name: s.values.Name,
        },
        scenes: scenesRaw.map(({ recordID: sceneID, values: { Type: type, Text: text, Order: order } }) => ({ sceneID, type, text, order }))
      })
    }

    return {
      callCenter: {
        callCenterID: callCenter.recordID,
        meta: {
          name: callCenter.values.Name,
          client: callCenter.values.Client,
          active: callCenter.values.Active,
          internal: callCenter.values.Internal,
          workspace: callCenter.values.Workspace,
        },
      },
      scripts,
    }
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
    .then(({ set = [] }) => {
      if (set && set.length) {
        return set[0].values
      }
      throw new Error('resolve.failed')
    })
}
