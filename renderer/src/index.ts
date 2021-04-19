 // SPDX-FileCopyrightText: 2020, Tomaž Jerman
 // SPDX-License-Identifier: Apache-2.0

import { renderPDF, renderHTML } from './engines'
import defaultStyle from './assets/defaultStyle'
import { Render } from './util'
import juice from 'juice'
import * as types from './types'

/**
 * render function renders the provided report object.
 * @param document The report we want to render
 */
async function render (document: types.Document): Promise<Render> {
  const hps = require('html-parse-stringify')
  const hm = require('html-minifier')

  // inline styles for easier processing
  let template = `<style>${defaultStyle}</style>${document.template}`
  template = juice(template)

  // minify template to remove unneeded components such as whitespace, comments, ...
  template = hm.minify(template, {
    collapseWhitespace: true,
    removeComments: true,
    removeEmptyAttributes: true,
  })

  // parse template to an ast tree
  const tree = hps.parse(template) as Array<types.Node>

  // render the report
  switch (document.renderer) {
    case types.RendererKind.PDF:
      return renderPDF(tree, document)

    case types.RendererKind.HTML:
      return renderHTML(tree, document)

    default:
      throw new Error('renderer.notSupported')
  }
}

export default {
  render,
  types,
}
