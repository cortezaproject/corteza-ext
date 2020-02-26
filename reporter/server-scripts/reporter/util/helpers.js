import { renderer } from '@cortezaproject/corteza-js'
import path from 'path'
import fs from 'fs'
import FormData from 'form-data'
import axios from 'axios'
import moment from 'moment'

// check for valid report / dashboard object
export function isRendered (report) {
  if (report.report && typeof report.report !== 'string') {
    return true
  } else if (report.dashboard && typeof report.dashboard !== 'string') {
    return true
  }

  return false
}

// tries to find the specified report
export async function checkRenderedReport (index, Compose, reportMod) {
  try {
    const { set: [report] } = await Compose.findRecords(`Index = '${index}'`, reportMod)
    return report
  } catch (e) {}
}

// tries to find the specified dashboard
export async function checkRenderedDashboard (index, Compose, dashboardMod) {
  try {
    const { set: [dashboard] } = await Compose.findRecords(`Index = '${index}'`, dashboardMod)
    return dashboard
  } catch (e) {}
}

// prepares data payload for reports
export async function prepareReportData (reportTpl, from, to, Compose, ns) {
  const reportTplMod = await Compose.findModuleByHandle('ext_reporter_report_template', ns)
  reportTpl = await Compose.findRecordByID(reportTpl, reportTplMod)

  // [from, to) inclusion
  let filter = `DATE(createdAt) >= DATE('${moment(from).format('YYYY-MM-DD')}') AND DATE(createdAt) < DATE('${moment(to).format('YYYY-MM-DD')}')`
  // support for additional filters defined by the template
  if (reportTpl.values.Filter) {
    filter = `(${filter}) AND (${reportTpl.values.Filter})`
  }

  const repMod = await Compose.findModuleByHandle(reportTpl.values.Module, ns)
  const { set: records } = await Compose.findRecords({ limit: 0, filter }, repMod)
  const header = repMod.fields.map(({ name, label }) => ({ name, label }))
  const body = records.map(r => header.map(({ name }) => r.values[name] || ''))

  return {
    // @todo include chart renderer
    // requires a few tweaks
    chart: undefined,
    report: {
      title: reportTpl.values.Title,
      description: reportTpl.values.Description,
      header,
      body
    }
  }
}

export async function renderReport (r, index, Compose, reportMod, ns) {
  // @todo support for custom templates
  const tpl = await loadTpl('reportGeneric.html')
  const data = await prepareReportData(r.report, r.from, r.to, Compose, ns)

  // render doc
  const { ext, report, type, meta } = await renderer.render({
    data,
    template: tpl,
    renderer: renderer.RendererKind.PDF,
    fontFace
  })

  // create a report entry
  const fd = new FormData()
  fd.append('upload', report, {
    filename: meta.title + ext,
    contentType: type
  })
  return Compose.makeRecord({
    Index: index,
    Template: r.report,
    Name: meta.title,
    IntervalFrom: r.from || new Date(),
    IntervalTo: r.to,
    Period: r.period,
    Report: await attachFile(ns, reportMod, fd, Compose)
  }, reportMod).then(r => Compose.saveRecord(r))
}

export async function renderDashboard (r, index, Compose, dashboardMod, ns) {
  const dashboardTplMod = await Compose.findModuleByHandle('ext_reporter_dashboard_template', ns)
  const dashboardTpl = await Compose.findRecordByID(r.dashboard, dashboardTplMod)

  // @todo support for custom templates
  const tpl = await loadTpl('dashboardGeneric.html')

  // dashboard consists of multiple reports; so this is what we shall do
  const reports = []
  for (const reportTpl of dashboardTpl.values.Reports) {
    reports.push(await prepareReportData(reportTpl, r.from, r.to, Compose, ns))
  }

  const data = {
    dashboard: {
      title: dashboardTpl.values.Title,
      description: dashboardTpl.values.Description,
      reports
    }
  }

  // render doc
  const { ext, report, type, meta } = await render({
    data,
    template: tpl,
    renderer: renderer.RendererKind.PDF,
    fontFace
  })

  // create a dashboard entry
  const fd = new FormData()
  fd.append('upload', report, {
    filename: meta.title + ext,
    contentType: type
  })

  return Compose.makeRecord({
    Index: index,
    Template: r.dashboard,
    Name: meta.title,
    IntervalFrom: r.from || new Date(),
    IntervalTo: r.to,
    Period: r.period,
    Dashboard: await attachFile(ns, dashboardMod, fd, Compose)
  }, dashboardMod).then(r => Compose.saveRecord(r))
}

export async function dispatchReport (r, Compose, ns) {
  let att, subject
  if (r.report) {
    att = await Compose.findAttachmentByID(r.report.values.Report, ns)
    subject = r.report.values.Name
  } else if (r.dashboard) {
    att = await Compose.findAttachmentByID(r.dashboard.values.Dashboard, ns)
    subject = r.dashboard.values.Name
  } else {
    throw new Error('report.invalidPayload')
  }

  for (const s of r.subscriptions) {
    await Compose.ComposeAPI.notificationEmailSend({
      to: [s.values.SendTo],
      subject,
      content: { html: subject },
      remoteAttachments: [Compose.ComposeAPI.baseURL + att.download]
    })

    // update subscription's flag
    s.values.LastReportAt = s.values.NextReportAt
    await Compose.saveRecord(s)
  }
}

// helper to attach a file for the given module
export async function attachFile (ns, mod, fd, Compose) {
  const ep = Compose.ComposeAPI.baseURL + Compose.ComposeAPI.recordUploadEndpoint({
    namespaceID: ns.namespaceID,
    moduleID: mod.moduleID
  })

  const { data } = await axios.post(ep, fd.getBuffer(), {
    headers: {
      ...fd.getHeaders(),
      Authorization: Compose.ComposeAPI.headers.Authorization
    }
  })

  if (data.error) {
    throw new Error(data.error)
  }

  return data.response.attachmentID
}

// helper to load the given template file
export async function loadTpl (tpl) {
  const pp = path.join(__dirname, 'assets/templates/', tpl)
  const buff = fs.readFileSync(pp)
  return buff.toString()
}
