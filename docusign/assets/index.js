// SPDX-FileCopyrightText: 2020, Tomaž Jerman
// SPDX-License-Identifier: Apache-2.0

import path from 'path'
import fs from 'fs'

// helper function to load templates
export function loadTpl (tpl) {
  const pp = path.join(__dirname, 'templates', tpl)
  const buff = fs.readFileSync(pp)
  return buff.toString()
}

export default {}
