// SPDX-FileCopyrightText: 2020, Tomaž Jerman
// SPDX-License-Identifier: Apache-2.0

import { parseBody, inSet } from '../shared/lib'
import { fieldKindMapping } from './provider/lib'
import * as mappers from './provider'
import axios from 'axios'

const apiBase = 'https://www.phoneburner.com/rest/'
const dialSessionEP = 'dialsession'

export default {
  label: 'PhoneBurner Session Builder',
  description: 'This automation script creates a PhoneBurner session based on te provided resources.',
  security: {
    // @todo...
    runAs: 'ext_phone-burner',
  },
  triggers (t) {
    return [
      t.on('request')
        .where('request.path', '/ext_phoneburner/session')
        .where('request.method', 'POST')
        .for('system:sink')
    ]
  },

  async exec ({ $request, $response }, { Compose }) {
    const body = parseBody($request)

    $response.status = 200
    $response.header = { 'Content-Type': ['application/json'] }

    // get configuration and other meta objects
    const ns = await Compose.resolveNamespace(body.ns)
    const mod = await Compose.findModuleByHandle('ext_phoneburner_configuration', ns)
    const config = await Compose.findFirstRecord(mod)

    // Determine callbacks
    const callbacks = []
    if (config.values.CallBeginCallback) {
      callbacks.push({ callback: config.values.CallBeginCallback, callback_type: 'api_callbegin' })
    }
    if (config.values.CallEndCallback) {
      callbacks.push({ callback: config.values.CallEndCallback, callback_type: 'api_callend' })
    }

    // Determine contacts
    const mapping = mappers[body.provider]
    if (!mapping) {
    // no mapping available; invalid request
      $response.status = 400
      return $response
    }

    const provider = await Compose.findModuleByHandle(body.provider, ns)
    const { set: records } = await Compose.findRecords(inSet('recordID', body.records), provider)
    const contacts = records.map(c => makePBContact(c, mapping))

    // required data for PB's webhooks
    const customData = {
      ns: body.ns,
      provider: body.provider
    }

    const url = `${apiBase}${config.values.APIVersion || '1'}/${dialSessionEP}`

    const data = await axios.post(
      url,
      { contacts, callbacks, customData },
      { withCredentials: true, headers: { Authorization: `Bearer ${config.values.AccessToken}` } }
    ).then(({ data }) => data)

    $response.body = JSON.stringify(data.dialsessions)
    return $response
  }
}

/**
 * makePBContact function creates a PB contact based on the provided record
 * and the mapping object.
 * Algorithm:
 *  * if mapping for the given field exists; apply it
 *  * if mapping for the given field doesn't exist:
 *    * if field type is allowed by PB, push it into custom_fields
 *    * else ignore the field
 * @param {Object} values Record values
 * @param {Module} module Record's module
 * @param {Object} mapping Field mapping object
 * @returns {Object}
 */
function makePBContact ({ values, module, recordID }, mapping) {
  const rtr = {}

  for (const f of module.fields) {
    let map = mapping[f.name]

    if (map) {
      // this allows us to map fields into multiple places
      if (!Array.isArray(map)) {
        map = [map]
      }
      map.forEach(m => {
        if ((typeof m) !== 'object') {
          rtr[m] = values[f.name]
        } else {
          if (!rtr[m.list]) {
            rtr[m.list] = []
          }
          rtr[m.list].push({ [m.key]: values[f.name], ...m.meta })
        }
      })
    } else {
      if (fieldKindMapping[f.kind]) {
        if (!rtr.custom_fields) {
          rtr.custom_fields = []
        }
        rtr.custom_fields.push({ name: f.name, type: fieldKindMapping[f.kind], value: values[f.name] })
      }
    }
  }

  rtr.lead_id = recordID
  return rtr
}
