import path from 'path'
import fs from 'fs'

// helper function to load templates
export function loadTpl (tpl) {
  const pp = path.join(__dirname, 'templates', tpl)
  const buff = fs.readFileSync(pp)
  return buff.toString()
}

export default {}
