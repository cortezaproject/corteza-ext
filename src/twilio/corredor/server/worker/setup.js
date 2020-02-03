import twClient from '../shared/twClient'
import deleteWorker from './shared/deleteWorker'
import { compose } from '@cortezaproject/corteza-js'

export default {
  label: 'Worker Setup',
  description:
`This automation script handles operations related to worker creation and updates.
It creates and configures a corresponding Twilio Worker that is able to accept calls withing a given workspace.`,
  triggers (t) {
    return [
      t.before('create')
        .for('compose:record')
        .where('module', ['ext_twilio_worker']),

      t.before('update')
        .for('compose:record')
        .where('module', ['ext_twilio_worker']),
    ]
  },

  async exec ({ event, $record, $module }, { Compose }) {
    // validation
    if (event === 'beforeCreate') {
      // check for existing worker for this workspace
      await Compose
        .findRecords(`Workspace = '${$record.values.Workspace}' AND User = '${$record.values.User}'`, 'ext_twilio_worker')
        .then(({ set = [] }) => {
          if (set.length) {
            throw new Error('user.notUnique')
          }
        })
    } else {
      // check for existing worker for this workspace OTHER then this worker
      await Compose
        .findRecords(`recordID != '${$record.recordID}' AND Workspace = '${$record.values.Workspace}' AND User = '${$record.values.User}'`, 'ext_twilio_worker')
        .then(({ set = [] }) => {
          if (set.length) {
            throw new Error('user.notUnique')
          }
        })
    }

    $record = new compose.Record($record, $module)
    const twilio = await twClient(Compose)
    const ws = await Compose.findRecordByID($record.values.Workspace, 'ext_twilio_workspace')

    const workerCallback = w => {
      $record.values.WorkerSid = w.sid
      return $record
    }

    // create a new worker
    if (!$record.values.WorkerSid) {
      return createWorker($record, twilio, ws.values.WorkspaceSid).then(workerCallback)
    } else {
      // update the worker; two cases
      const $oldRecord = await Compose.findRecordByID($record.recordID)
      if ($record.values.Workspace === $oldRecord.values.Workspace) {
        // regular worker update
        return updateWorker($record, twilio, ws.values.WorkspaceSid).then(workerCallback)
      } else {
        // worker migration to another workspace
        const ows = await Compose.findRecordByID($oldRecord.values.Workspace, 'ext_twilio_workspace')
        return deleteWorker($record, twilio, ows.values.WorkspaceSid)
          .then(() => createWorker($record, twilio, ws.values.WorkspaceSid))
          .then(workerCallback)
      }
    }
  },
}

/**
 * createWorker method creates a new worker
 * @param {Object} $record Worker's record
 * @param {Object} twilio Twilio client
 * @param {String} WorkspaceSid WorkspaceSid for the given worker
 * @returns {Promise<Object>}
 */
async function createWorker ($record, twilio, WorkspaceSid) {
  return twilio.taskrouter.workspaces(WorkspaceSid)
    .workers
    .create({
      friendlyName: $record.values.Name,
      // contact_uri attribute is required by the <dequeue> TwiML verb
      attributes: JSON.stringify({
        contact_uri: `client:${$record.values.User}`,
      }),
    })
}

/**
 * updateWorker method updates the given worker
 * @param {Object} $record Worker's record
 * @param {Object} twilio Twilio client
 * @param {String} WorkspaceSid WorkspaceSid for the given worker
 * @returns {Promise<Object>}
 */
async function updateWorker ($record, twilio, WorkspaceSid) {
  return twilio.taskrouter.workspaces(WorkspaceSid)
    .workers($record.values.WorkerSid)
    .update({
      friendlyName: $record.values.Name,
      // contact_uri attribute is required by the <dequeue> TwiML verb
      attributes: JSON.stringify({
        contact_uri: `client:${$record.values.User}`,
      }),
    })
}
