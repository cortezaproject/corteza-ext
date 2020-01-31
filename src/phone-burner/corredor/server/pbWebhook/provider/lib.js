/**
 * genericMapper function maps a set of generic values into a target object
 * @param {Array<Object>|Object} values Value or a set of values to map
 * @param {Object} rtr Target object
 * @returns {Object}
 */
export function genericMapper (values = [], rtr) {
  if (!Array.isArray(values)) {
    values = [values]
  }

  values.forEach(({ name, value }) => {
    rtr[name] = value
  })

  return rtr
}
