import Twilio from 'twilio'
import { inSet } from '../shared/lib'

const ClientCapability = Twilio.jwt.ClientCapability
const taskrouter = Twilio.jwt.taskrouter
const util = taskrouter.util
const taskrouterBaseURL = 'https://taskrouter.twilio.com';
const version = 'v1';

export const capability = {
  label: 'Twilio Capability Tokens',
  description: `This automation script handles Twilio capability token creation.`,
  triggers (t) {
    return [
      // @todo .on('request')
    ]
  },

  async exec (args, { Compose }) {
    // @todo get from request
    const params = {
      userID: '@todo'
    }

    const config = await Compose.findFirstRecord('ext_twilio_configuration')

    const cpb = new ClientCapability({
      accountSid: config.values.ProductionSID,
      authToken: config.values.ProductionToken,
    })
    cpb.addScope(new ClientCapability.IncomingClientScope(params.userID))
    cpb.addScope(new ClientCapability.OutgoingClientScope({
      applicationSid: config.values.OutboundApplicationSid,
    }))

    return cpb.toJwt()
  },
}

export const worker = {
  label: 'Twilio Worker Tokens',
  description: `This automation script handles Twilio Worker token creation.`,
  triggers (t) {
    return [
      // @todo .on('request')
    ]
  },

  async exec (args, { Compose }) {
    // @todo get from request
    const params = {
      userID: '@todo'
    }

    const config = await Compose.findFirstRecord('ext_twilio_configuration')

    // get user's workers and workspace refs
    const { set: workersRaw } = await Compose.findRecords(`User = '${params.userID}'`, 'ext_twilio_worker')
    const workerWorkspaces = Array.from(new Set(workersRaw.map(({ values }) => values.Workspace)))
    const { set: workspaces } = await Compose.findRecords(inSet('recordID', workerWorkspaces), 'ext_twilio_workspace')
    const workers = workersRaw.map(w => {
      const ws = workspaces.find(ws => ws.recordID === w.values.Workspace)
      if (!ws) {
        return
      }

      return {
        workerID: w.recordID,
        workerSid: w.values.WorkerSid,
        name: w.values.Name,
        workspaceSid: ws.values.WorkspaceSid
      }
    }).filter(w => w)

    // create a token for each worker
    return workers.map(worker => {
      const token = genWFToken(
        config.values.ProductionSID,
        config.values.ProductionToken,
        worker.workspaceSid,
        worker.workerSid,
      )
      return { token, worker }
    })
  },
}

/**
 * genWFToken generates a worker token
 * @param {String} accountSid Twilio account SID
 * @param {String} authToken Twilio account token
 * @param {String} workspaceSid Worker's workspace SID
 * @param {String} workerSid Worker's SID
 * @returns {String} Worker token
 */
function genWFToken (accountSid, authToken, workspaceSid, workerSid) {
  const capability = new taskrouter.TaskRouterCapability({
    accountSid,
    authToken,
    workspaceSid,
    channelId: workerSid,
  })

  // Event Bridge Policies
  const eventBridgePolicies = util.defaultEventBridgePolicies(accountSid, workerSid);

  // Worker Policies
  const workerPolicies = util.defaultWorkerPolicies(version, workspaceSid, workerSid);

  const workspacePolicies = [
    // Workspace fetch Policy
    buildWorkspacePolicy(undefined, workspaceSid),
    // Task reservations
    buildWorkspacePolicy({ resources: ['Tasks', '**'], method: 'POST' }, workspaceSid),
    // Worker Activities Update Policy
    buildWorkspacePolicy({ resources: ['Workers', workerSid], method: 'POST' }, workspaceSid),
    // Worker Activities Fetch Policy
    buildWorkspacePolicy({ resources: ['Workers', workerSid], method: 'GET' }, workspaceSid),
  ]

  eventBridgePolicies
    .concat(workerPolicies)
    .concat(workspacePolicies)
    .forEach(function (policy) {
      capability.addPolicy(policy)
    })

  return capability.toJwt()
}

/**
 * buildWorkspacePolicy helps construct a policy for the given worker
  // @todo check these ones
 * @ref https://www.twilio.com/docs/taskrouter/js-sdk/workspace/worker?code-sample=code-creating-a-taskrouter-worker-capability-token&code-language=Node.js&code-sdk-version=3.x
 * @param {Object} options Policy options
 * @param {String} workspaceSid Worker's workspace SID
 * @returns {taskrouter.TaskRouterCapability.Policy}
 */
function buildWorkspacePolicy(options, workspaceSid) {
  options = options || {}
  var resources = options.resources || []
  var urlComponents = [taskrouterBaseURL, version, 'Workspaces', workspaceSid]

  return new taskrouter.TaskRouterCapability.Policy({
    url: urlComponents.concat(resources).join('/'),
    method: options.method || 'GET',
    allow: true
  })
}
