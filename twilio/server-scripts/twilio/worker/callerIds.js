import { inSet, parseBody } from '../shared/lib'

export default {
  label: 'Caller IDs',
  description: 'This automation script provides a complete set of caller IDs for the given user',
  security: {
    // @todo...
    runAs: 'tomaz.jerman@crust.tech',
  },
  triggers (t) {
    return [
      t.on('request')
        .where('request.path', '/ext_twilio/worker/caller-id')
        .where('request.method', 'POST')
        .for('system:sink'),
    ]
  },

  async exec ({ $request, $response }, { Compose }) {
    const body = parseBody($request)
    $response.status = 200
    $response.header = { 'Content-Type': ['application/json'] }

    const ns = await Compose.resolveNamespace(body.ns)
    const modC = await Compose.findModuleByHandle('ext_twilio_caller', ns)
    const modWK = await Compose.findModuleByHandle('ext_twilio_worker', ns)
    const modCC = await Compose.findModuleByHandle('ext_twilio_call_center', ns)

    // 1. get worker's personal caller IDs
    const { set: personal } = await Compose.findRecords(`User = '${body.userID}'`, modC)

    // 2. get call center's caller IDs
    // 2.1. find workspaces that the worker is in
    const { set: workers } = await Compose.findRecords(`User = '${body.userID}'`, modWK)
    // 2.2. get all call centers for all available workspaces
    const { set: callCenters } = await Compose.findRecords(inSet('Workspace', workers.map(w => w.values.Workspace)), modCC)

    // generate a final set of caller IDs
    $response.body = JSON.stringify({
      callerID: personal.map(({ values: { Name: name, PhoneNumber: number } }) => ({ text: name, value: number }))
        .concat(callCenters.map(({ values: { Name: name, PhoneNumber: number } }) => ({ text: `Call center: ${name}`, value: number }))),
    })

    return $response
  },
}
