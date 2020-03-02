import twClient from '../shared/twClient'

export default {
  label: 'Workspace Teardown',
  description:
`This automation script handles operations related to workspace removal.
It removes the corresponding Twilio Workspace and all related workers and call centers.`,
  triggers (t) {
    return [
      t.before('delete')
        .for('compose:record')
        .where('module', ['ext_twilio_workspace']),
    ]
  },

  async exec ({ $oldRecord }, { Compose }) {
    const twilio = await twClient(Compose)

    // teardown Twilio workspace
    await twilio.taskrouter
      .workspaces($oldRecord.values.WorkspaceSid)
      .remove()

    // delete related call centers
    await Compose
      .findRecords(`Workspace = '${$oldRecord.values.WorkspaceSid}'`, 'ext_twilio_call_center')
      .then(({ set = [] }) => set.forEach(async (cc) => Compose.deleteRecord(cc)))

    // delete related workers
    await Compose
      .findRecords(`Workspace = '${$oldRecord.values.WorkspaceSid}'`, 'ext_twilio_worker')
      .then(({ set = [] }) => set.forEach(async (cc) => Compose.deleteRecord(cc)))
  },
}
