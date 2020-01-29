import { inSet } from '../shared/lib'

export default {
  label: 'Caller IDs',
  description: 'This automation script provides a complete set of caller IDs for the given user',
  triggers (t) {
    // @todo .on('request')
  },

  async exec (args, { Compose }) {
    // @todo get over args
    const params = {
      userID: '@todo'
    }

    // 1. get worker's personal caller IDs
    const { set: personal } = await Compose.findRecords(`User = '${params.userID}'`, 'ext_twilio_caller')

    // 2. get call center's caller IDs
    // 2.1. find workspaces that the worker is in
    const { set: workers } = await Compose.findRecords(`User = '${params.userID}'`, 'ext_twilio_worker')
    // 2.2. get all call centers for all available workspaces
    const { set: callCenters } = await Compose.findRecords(inSet('Workspace', workers.map(w => w.values.Workspace)), 'ext_twilio_call_center')

    // generate a final set of caller IDs
    return personal.map(({ values: { Name: name, PhoneNumber: number } }) => ({ personal: true, name, number }))
      .concat(callCenters.map(({ values: { Name: name, PhoneNumber: number } }) => ({ callCenter: true, name, number })))
  },
}
