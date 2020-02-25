export default {
  label: 'Insert solution number',
  description: 'Sets the solution number based on the settings',

  * triggers ({ before }) {
    yield before('create')
      .for('compose:record')
      .where('module', 'Solution')
      .where('namespace', 'crm')
  },

  async exec ({ $record }, { Compose }) {
    // Get the default settings
    return Compose.findLastRecord('Settings').then(async settings => {
      // Map the case number
      let nextSolutionNumber = settings.values.SolutionNextNumber
      if (!nextSolutionNumber || isNaN(nextSolutionNumber)) {
        nextSolutionNumber = 0
      }
      $record.values.SolutionNumber = nextSolutionNumber
      const nextSolutionNumberUpdated = parseInt(nextSolutionNumber, 10) + 1

      // Update the config
      settings.values.SolutionNextNumber = nextSolutionNumberUpdated

      await Compose.saveRecord(settings)
      return $record
    })
  }
}
