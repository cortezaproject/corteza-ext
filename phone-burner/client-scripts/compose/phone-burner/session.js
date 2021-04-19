// SPDX-FileCopyrightText: 2020, Tomaž Jerman
// SPDX-License-Identifier: Apache-2.0

export default {
  label: 'PhoneBurner',
  description: 'Initializes & opens a PhoneBurner session.',

  triggers ({ on }) {
    return on('manual')
      .for('compose:module')
      .uiProp('app', 'compose')
  },

  async exec ({ $namespace, $module, selected }, { SystemAPI, Compose }) {
    const mod = await Compose.findModuleByHandle('ext_phoneburner_configuration', $namespace)
    const config = await Compose.findFirstRecord(mod)

    const cfg = {
      method: 'post',
      url: `/sink/ext_phoneburner/session?__sign=${config.values.SinkSign}`
    }

    cfg.data = {
      ns: $namespace.slug,
      provider: $module.handle,
      records: selected.map(({ recordID }) => recordID)
    }

    const data = await SystemAPI.api().request(cfg).then(({ data }) => data)

    window.open(data.redirect_url)
  }
}
