import {
  isRendered,
  renderReport,
  renderDashboard,
  dispatchReport,
  checkRenderedReport,
  checkRenderedDashboard
} from './util/helpers'

// @todo improve this!
const nsSlug = 'crm'

export default {
  label: 'Reporter',
  description: 'It sends annual reports.',
  /* istanbul ignore next */
  triggers ({ on }) {
    // @todo interval
    return on('manual')
      .for('compose:record')
      .uiProp('app', 'compose')
  },

  async exec (_, { Compose }) {
    // meta objects
    const ns = await Compose.resolveNamespace(nsSlug)
    const subMod = await Compose.findModuleByHandle('ext_reporter_subscription', ns)
    const reportMod = await Compose.findModuleByHandle('ext_reporter_report', ns)
    const dashboardMod = await Compose.findModuleByHandle('ext_reporter_dashboard', ns)

    // find all subscriptions that should be handled.
    // They should be fetched & processed in chunks, to avoid long processing times
    // and execution timeouts.
    const { set: subs } = await Compose.findRecords({
      filter: '(NextReportAt IS NOT NULL) AND (NextReportAt <= CURDATE())',
      // this will assure at least some grouping in the next step
      sort: 'Report DESC,Dashboard DESC'
    }, subMod)

    // determine unique reports based on template & period
    const reports = {}
    for (const s of subs) {
      const index = `${s.values.Period}${s.values.Report || s.values.Dashboard}${(new Date(s.values.NextReportAt)).getTime()}`

      if (!reports[index]) {
        // attempt to resolve existing documents for the given index
        const report = await checkRenderedReport(index, Compose, reportMod)
        const dashboard = await checkRenderedDashboard(index, Compose, dashboardMod)

        reports[index] = {
          subscriptions: [],
          from: new Date(s.values.LastReportAt),
          to: new Date(s.values.NextReportAt),
          period: s.values.Period,

          report: report || s.values.Report,
          dashboard: dashboard || s.values.Dashboard
        }
      }

      reports[index].subscriptions.push(s)
    }

    // render missing documents
    for (const [ index, r ] of Object.entries(reports)) {
      if (!isRendered(r)) {
        if (r.report) {
          r.report = await renderReport(r, index, Compose, reportMod, ns)
        } else if (r.dashboard) {
          r.dashboard = await renderDashboard(r, index, Compose, dashboardMod, ns)
        }
      }
    }

    // satisfy subscriptions
    for (const r of Object.values(reports)) {
      await dispatchReport(r, Compose, ns)
    }
  }
}
