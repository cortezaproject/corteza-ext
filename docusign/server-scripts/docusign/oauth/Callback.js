import b64 from 'base-64'
import axios from 'axios'
import { loadTpl } from '../../../assets'
import renderer from '@cortezaproject/corteza-ext-renderer'

export function parseBody (req) {
  if (!req.rawBody) {
    return {}
  } else {
    return JSON.parse(b64.decode(req.rawBody))
  }
}

export default {
  label: 'Oauth callback',
  security: {
    runAs: 'tomaz.jerman@crust.tech',
  },
  triggers ({ on }) {
    return on('request')
      // .where('request.path', '/ext_oauth/callback')
      .where('request.method', 'GET')
      .for('system:sink')
  },
  async exec ({ $request, $response }, { Compose }) {
    $response.status = 200
    $response.header = { 'Content-Type': ['text/html; charset=UTF-8'] }
    let data = { $assets: {} }
    let tpl
    try {
      const mod = await Compose.findModuleByHandle('ext_docusign_configuration', 'crm')
      const cfg = await Compose.findFirstRecord(mod)

      // Exchange the code for an access token
      const code = $request.query.code[0]
      let ep
      if (cfg.values.InProduction) {
        ep = 'https://account.docusign.com/oauth/token'
      } else {
        ep = 'https://account-d.docusign.com/oauth/token'
      }

      const { access_token: at, refresh_token: rt, expires_in: ei } = await axios.post(
        ep,
        `grant_type=authorization_code&code=${code}`,
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
      tpl = loadTpl('auth-ok.html')
    } catch (e) {
      tpl = loadTpl('auth-nok.html')
      $response.status = 200
      data.error = e.message
      if (e.response && e.response.data) {
        data.error += `\n${JSON.stringify(e.response.data)}`
      }
    }

    const { report } = await renderer.render({
      data,
      template: tpl,
      renderer: renderer.types.RendererKind.HTML,
    })

    $response.body = report.toString()
    return $response
  },
}
