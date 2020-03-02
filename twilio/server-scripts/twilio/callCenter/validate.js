export const bc = {
  label: 'Twilio Call Center Validation',
  description:
`This automation script is a pre-requisite for any call center creation events.
It validates if the given call center is valid and unique.`,
  triggers (t) {
    return [
      t.before('create')
        .for('compose:record')
        .where('module', ['ext_twilio_call_center']),
    ]
  },

  async exec ({ $record }, { Compose }) {
    // check for existing call center for this workspace
    await Compose
      .findRecords(`Workspace = '${$record.values.Workspace}' AND Client = '${$record.values.Client}'`, 'ext_twilio_call_center')
      .then(({ set = [] }) => {
        if (set.length) {
          throw new Error('callCenter.notUnique')
        }
      })
  },
}

export const bu = {
  label: 'Twilio Call Center Validation',
  description:
`This automation script is a pre-requisite for any call center update events.
It validates if the given call center is valid and unique.`,
  triggers (t) {
    return [
      t.before('update')
        .for('compose:record')
        .where('module', ['ext_twilio_call_center']),
    ]
  },

  async exec ({ $record }, { Compose }) {
    // check for existing call center for this workspace OTHER then this call center
    await Compose
      .findRecords(`recordID != '${$record.recordID}' AND Workspace = '${$record.values.Workspace}' AND Client = '${$record.values.Client}'`, 'ext_twilio_call_center')
      .then(({ set = [] }) => {
        if (set.length) {
          throw new Error('callCenter.notUnique')
        }
      })
  },
}
