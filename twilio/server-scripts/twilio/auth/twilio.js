import Twilio from 'twilio'
import { inSet, parseBody } from '../shared/lib'
import twClient from '../shared/twClient'

const ClientCapability = Twilio.jwt.ClientCapability
const taskrouter = Twilio.jwt.taskrouter
const util = taskrouter.util
const taskrouterBaseURL = 'https://taskrouter.twilio.com'
const version = 'v1'

export const capability = {
  label: 'Twilio Capability Tokens',
  description: `This automation script handles Twilio capability token creation.`,
  security: {
    // @todo...
    runAs: 'tomaz.jerman@crust.tech',
  },
  triggers (t) {
    return [
      t.on('request')
        .where('request.path', '/ext_twilio/auth/capability')
        // @todo change to GET
        .where('request.method', 'POST')
        .for('system:sink'),
    ]
  },

  async exec ({ $request, $response }, { Compose }) {
    const body = parseBody($request)
    $response.status = 200
    $response.header = { 'Content-Type': ['application/json'] }

    const ns = await Compose.resolveNamespace(body.ns)
    const mod = await Compose.findModuleByHandle('ext_twilio_configuration', ns)
    const config = await Compose.findFirstRecord(mod)

    const cpb = new ClientCapability({
      accountSid: config.values.ProductionSID,
      authToken: config.values.ProductionToken,
    })
    cpb.addScope(new ClientCapability.IncomingClientScope(body.userID))
    cpb.addScope(new ClientCapability.OutgoingClientScope({
      applicationSid: config.values.OutboundApplicationSid,
    }))

    $response.body = JSON.stringify({
      jwt: cpb.toJwt(),
    })
    return $response
  },
}

export const worker = {
  label: 'Twilio Worker Tokens',
  description: `This automation script handles Twilio Worker token creation.`,
  security: {
    // @todo...
    runAs: 'tomaz.jerman@crust.tech',
  },
  triggers (t) {
    return [
      t.on('request')
        .where('request.path', '/ext_twilio/auth/worker')
        // @todo change to GET
        .where('request.method', 'POST')
        .for('system:sink'),
    ]
  },

  async exec ({ $request, $response }, { Compose }) {
    try {
      const body = parseBody($request)
      $response.status = 200
      $response.header = { 'Content-Type': ['application/json'] }

      // get config and meta objects
      const ns = await Compose.resolveNamespace(body.ns)
      const configMod = await Compose.findModuleByHandle('ext_twilio_configuration', ns)
      const workerMod = await Compose.findModuleByHandle('ext_twilio_worker', ns)
      const workspaceMod = await Compose.findModuleByHandle('ext_twilio_workspace', ns)
      const config = await Compose.findFirstRecord(configMod)

      const twilio = await twClient(Compose, false, configMod)

      // get user's workers and workspace refs
      let q = `User = '${body.userID}'`
      // support for specific worker
      if (body.workerID) {
        q += ` AND recordID = '${body.workerID}'`
      }
      const { set: workersRaw } = await Compose.findRecords(q, workerMod)
      const workerWorkspaces = Array.from(new Set(workersRaw.map(({ values }) => values.Workspace)))
      const { set: workspaces } = await Compose.findRecords(inSet('recordID', workerWorkspaces), workspaceMod)
      const workers = workersRaw.map(w => {
        const ws = workspaces.find(ws => ws.recordID === w.values.Workspace)
        if (!ws) {
          return
        }

        return {
          workerID: w.recordID,
          workerSid: w.values.WorkerSid,
          name: w.values.Name,
          workspaceSid: ws.values.WorkspaceSid,
        }
      }).filter(w => w)

      // get activities for the given workspace
      for (const w of workers) {
        const acts = await twilio.taskrouter.workspaces(w.workspaceSid)
          .activities
          .list({ limit: 20 })

        w.activities = acts.reduce((acc, { sid, friendlyName }) => {
          acc[friendlyName] = sid
          return acc
        }, {})
      }

      // create a token for each worker
      $response.body = JSON.stringify({
        workers: workers.map(worker => {
          const token = genWFToken(
            config.values.ProductionSID,
            config.values.ProductionToken,
            worker.workspaceSid,
            worker.workerSid,
          )
          return { token, worker }
        }),
      })
      return $response
    } catch (e) {
      console.error(e)
    }
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
  const eventBridgePolicies = util.defaultEventBridgePolicies(accountSid, workerSid)

  // Worker Policies
  const workerPolicies = util.defaultWorkerPolicies(version, workspaceSid, workerSid)

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
function buildWorkspacePolicy (options, workspaceSid) {
  options = options || {}
  var resources = options.resources || []
  var urlComponents = [taskrouterBaseURL, version, 'Workspaces', workspaceSid]

  return new taskrouter.TaskRouterCapability.Policy({
    url: urlComponents.concat(resources).join('/'),
    method: options.method || 'GET',
    allow: true,
  })
}
