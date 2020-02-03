import twClient from '../shared/twClient'
import { compose } from '@cortezaproject/corteza-js'

export default {
  label: 'Workspace Setup',
  description:
`This automation script handles operations related to workspace creation and updates.
It creates and configures a corresponding Twilio Workspace.`,
  triggers (t) {
    return [
      t.before('create')
        .for('compose:record')
        .where('module', ['ext_twilio_workspace']),

      t.before('update')
        .for('compose:record')
        .where('module', ['ext_twilio_workspace']),
    ]
  },

  async exec ({ $record, $module }, { Compose }) {
    $record = new compose.Record($record, $module)
    const twilio = await twClient(Compose)
    return setupWorkspace({ twilio, $record })
      .then(setupTaskQueue)
      .then(setupWorkflow)
      .then(({ $record }) => {
        return $record
      })
  },
}

/**
 * setupWorkspace function creates a new workspace and initializes it's activities
 * @returns {Promise<*>}
 */
async function setupWorkspace ({ twilio, $record, ...rest }) {
  const args = {
    friendlyName: $record.values.Name,
    multiTaskEnabled: false,
    template: 'FIFO',
    prioritizeQueueOrder: 'FIFO',
  }

  const callback = r => {
    $record.values.WorkspaceSid = r.sid
    return { twilio, $record, ...rest }
  }

  // Update existing workspace
  if ($record.values.WorkspaceSid) {
    return twilio.taskrouter
      .workspaces($record.values.WorkspaceSid)
      .update(args)
      .then(callback)
  } else {
    // Create new workspace
    return twilio.taskrouter
      .workspaces
      .create(args)
      .then(callback)
  }
}

/**
 * setupTaskQueue function creates a new task queue for the given workspace
 * @returns {Promise<*>}
 */
async function setupTaskQueue ({ twilio, $record, ...rest }) {
  // Fetch default task queue
  let defaultTQ
  if ($record.values.TaskQueueSid) {
    defaultTQ = await twilio.taskrouter
      .workspaces($record.values.WorkspaceSid)
      .taskQueues($record.values.TaskQueueSid)
      .fetch()
  } else {
    defaultTQ = await twilio.taskrouter
      .workspaces($record.values.WorkspaceSid)
      .taskQueues
      .list({ limit: 1 })
      // Twilio creates an initial task queue
      .then(([tq]) => tq)
  }

  // update the task queue
  return twilio.taskrouter
    .workspaces($record.values.WorkspaceSid)
    .taskQueues(defaultTQ.sid)
    .update({
      friendlyName: 'corteza_tq',
    })
    .then(tq => {
      $record.values.TaskQueueSid = tq.sid
      return { twilio, $record, ...rest }
    })
}

/**
 * setupWorkflow function creates a new workflow for the given workspace and task queue
 * @returns {Promise<*>}
 */
async function setupWorkflow ({ twilio, $record, ...rest }) {
  // Fetch default workflow
  let defaultWF
  if ($record.values.WorkflowSid) {
    defaultWF = await twilio.taskrouter
      .workspaces($record.values.WorkspaceSid)
      .workflows($record.values.WorkflowSid)
      .fetch()
  } else {
    defaultWF = await twilio.taskrouter
      .workspaces($record.values.WorkspaceSid)
      .workflows
      .list({ limit: 1 })
      // Twilio creates an initial workflow
      .then(([wf]) => wf)
  }

  // update the workflow
  return twilio.taskrouter
    .workspaces($record.values.WorkspaceSid)
    .workflows(defaultWF.sid)
    .update({
      friendlyName: 'corteza_wf',
      assignmentCallbackUrl: $record.values.AssignmentCallbackUrl,
      // In seconds
      taskReservationTimeout: $record.values.TaskTimeout || 30,
    })
    .then(wf => {
      $record.values.WorkflowSid = wf.sid
      return { twilio, $record, ...rest }
    })
}
