// SPDX-FileCopyrightText: 2020, Tomaž Jerman
// SPDX-License-Identifier: Apache-2.0

import { parseBody } from '../shared/lib'
import * as mappers from './provider'

export default {
  label: 'PhoneBurner Webhook',
  description: 'This automation script provides a PhoneBurner webhook.',
  security: {
    runAs: 'ext_phone-burner'
  },
  triggers (t) {
    return [
      t.on('request')
        .where('request.path', '/ext_phoneburner/webhook/api_callend')
        .where('request.method', 'POST')
        .for('system:sink')
    ]
  },

  async exec ({ $request, $response }, { Compose }) {
    console.debug('ext.phoneburner.webhook.callEnd')
    const body = parseBody($request)
    $response.status = 200
    $response.header = { 'Content-Type': ['application/json'] }

    // get meta objects
    const ns = await Compose.resolveNamespace(body.custom_data.ns)
    const mod = await Compose.findModuleByHandle(body.custom_data.provider, ns)
    const original = await Compose.findRecordByID(body.contact.lead_id, mod)
    const mapping = mappers[body.custom_data.provider]
    if (!mapping) {
      // no mapping available; invalid request
      $response.status = 400
      return $response
    }

    // update original record values
    parsePBContact(body.contact, mapping, original.values)
    await Compose.saveRecord(original)
    return $response
  }
}

/**
 * parsePBContact function converts PhoneBurner's contact into a key: value pairs
 * based on the provided mapping object.
 * Algorithm:
 *  * if mapping for given field exists:
 *    * if object; use recursive resolution
 *    * if function; use the function,
 *    * else; apply simple k: v mapping
 *  * else ignore
 * @param {Object} data Contact's data
 * @param {Object} mapping Field mapping object
 * @returns {Object}
 */
function parsePBContact (data, mapping, rtr = {}) {
  for (const f in data) {
    const map = mapping[f]
    if (!map) {
      continue
    }

    if ((typeof map) === 'object') {
      parsePBContact(data[f], map, rtr)
    } else if ((typeof map) === 'function') {
      map(data[f], rtr)
    } else {
      rtr[map] = data[f]
    }
  }

  return rtr
}
