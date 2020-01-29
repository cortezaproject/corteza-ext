/**
 * inSet function creates a query string that represents an in set check
 * @param {String} key Field name
 * @param {Array<String>} values Values to check for
 * @returns {String}
 */
export function inSet (key, values) {
  return values.reduce((acc, v) => acc.concat(`${key}=${v}`), []).join(' OR ')
}
