export default {
  label: 'Request Consent',
  triggers ({ on }) {
    return on('manual')
      .for('compose:record')
      .uiProp('app', 'compose')
  },

  async exec (_, { Compose }) {
    const cfg = await Compose.findFirstRecord('ext_docusign_configuration')

    let baseURL
    if (cfg.values.InProduction) {
      baseURL = 'https://account.docusign.com/oauth/auth'
    } else {
      baseURL = 'https://account-d.docusign.com/oauth/auth'
    }
    let rdrURL = cfg.values.RedirectURL
    let query = `?response_type=code&scope=signature%20extended&client_id=${cfg.values.IntegrationKey}&redirect_uri=`

    const url = `${baseURL}${query}${rdrURL}`
    window.open(url, 'blank')
  },
}
