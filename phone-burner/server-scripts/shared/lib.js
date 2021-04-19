// SPDX-FileCopyrightText: 2020, Tomaž Jerman
// SPDX-License-Identifier: Apache-2.0

import b64 from 'base-64'

/**
 * inSet function creates a query string that represents an in set check
 * @param {String} key Field name
 * @param {Array<String>} values Values to check for
 * @returns {String}
 */
export function inSet (key, values) {
  return values.reduce((acc, v) => acc.concat(`${key}=${v}`), []).join(' OR ')
}

/**
 * Helper function parses request's rawBody and creates a body
 * @param {Object} req Request object
 * @returns {Object}
 */
export function parseBody (req) {
  if (!req.rawBody) {
    return {}
  } else {
    return JSON.parse(b64.decode(req.rawBody))
  }
}
