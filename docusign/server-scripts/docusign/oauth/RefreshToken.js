export default {
  label: 'Refresh Access Token',
  triggers ({ every }) {
    return every('0 0 * * * * *')
      .for('compose:record')
      .where('module', 'ext_docusign_configuration')
  },
  async exec ({ $record }, { Compose }) {
    const n = new Date()
    const cfg = await Compose.findFirstRecord('ext_docusign_configuration')
    if (!cfg.values.ExpiresAt) {
      return
    }

    let ep
    if (cfg.values.InProduction) {
      ep = 'https://account.docusign.com/oauth/token'
    } else {
      ep = 'https://account-d.docusign.com/oauth/token'
    }

    const { access_token: at, refresh_token: rt, expires_in: ei } = await axios.post(
      ep,
      `grant_type=refresh_token&refresh_token=${cfg.values.RefreshToken}`,
      {
        headers: {
          Authorization: `Basic ${b64.encode(`${cfg.values.IntegrationKey}:${cfg.values.IntegrationSecret}`)}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    ).then(e => e.data)

    cfg.values.AccessToken = at
    cfg.values.RefreshToken = rt
    const d = new Date()
    // Add a little safety buffer for expiration
    d.setSeconds(d.getSeconds() * (parseInt(ei) * 0.75))
    cfg.values.ExpiresAt = d.toISOString()
    await Compose.saveRecord(cfg)
  },
}
