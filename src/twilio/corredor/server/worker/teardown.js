import twClient from '../shared/twClient'
import deleteWorker from './shared/deleteWorker'

export default {
  label: 'Worker Teardown',
  description:
`This automation script handles operations related to worker removal.
It removes the corresponding Twilio Worker.`,
  triggers (t) {
    return [
      t.before('delete')
        .for('compose:record')
        .where('module', ['ext_twilio_worker']),
    ]
  },

  async exec ({ $oldRecord }, { Compose }) {
    const twilio = await twClient(Compose)

    const ws = await Compose.findRecordByID($oldRecord.values.Workspace, 'ext_twilio_workspace')
    return deleteWorker($oldRecord, twilio, ws.values.WorkspaceSid)
      .then(() => undefined)
  },
}
