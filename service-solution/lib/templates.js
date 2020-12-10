export function procTemplate (tpl, pairs = {}) {
  return tpl.replace(/{{\s*(.+?)\s*}}/g, (match) => {
    // remove {{, }} and extra spaces
    const token = match.substr(2, match.length - 4).trim().split('.', 2)

    // return the placeholder if we do not find the value
    const miss = '{{' + token.join('.') + '}}'

    if (token.length === 1) {
      // handle simpe key-value pairs
      return pairs[token] || miss
    } else {
      // handle complex key-key-value (ie: modulename: recordvalues)
      const [key, field] = token
      return pairs[key] && pairs[key][field] ? pairs[key][field] : miss
    }
  })
}
