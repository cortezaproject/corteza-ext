// SPDX-FileCopyrightText: 2020, Jože Fortun, Tomaž Jerman
// SPDX-License-Identifier: Apache-2.0


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
    const settings = await Compose.findLastRecord('Settings')

    // Map the case number
    let nextSolutionNumber = settings.values.SolutionNextNumber
    if (!nextSolutionNumber || isNaN(nextSolutionNumber)) {
      nextSolutionNumber = 0
    }
    $record.values.SolutionNumber = nextSolutionNumber

    settings.values.SolutionNextNumber = parseInt(nextSolutionNumber, 10) + 1
    await Compose.saveRecord(settings)

    return $record
  }
}
