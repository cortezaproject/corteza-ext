export default {
  label: 'Insert case number',
  description: 'Sets case number to next case number in settings',

  * triggers ({ before }) {
    yield before('create')
      .for('compose:record')
      .where('module', 'Case')
      .where('namespace', 'crm')
  },

  async exec ({ $record }, { Compose }) {
    return Compose.findLastRecord('Settings').then(async settings => {
      // Map the case number
      let nextCaseNumber = settings.values.CaseNextNumber
      if (!nextCaseNumber || isNaN(nextCaseNumber)) {
        nextCaseNumber = 0
      }

      $record.values.CaseNumber = ('' + nextCaseNumber).padStart(8, '0')
      const nextCaseNumberUpdated = parseInt(nextCaseNumber, 10) + 1

      // Update the config
      settings.values.CaseNextNumber = nextCaseNumberUpdated
      await Compose.saveRecord(settings)
      return $record
    })
  }
}
