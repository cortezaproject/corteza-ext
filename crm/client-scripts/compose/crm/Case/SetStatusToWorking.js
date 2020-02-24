export default {
  name: 'SetStatusToWorking',
  label: 'Set case status to working',
  description: 'Sets status of case to "Working"',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .where('module', 'Case')
      .where('namespace', 'crm')
      .uiProp('app', 'compose')
  },

  async exec ({ $record }, { Compose }) {
    // Update the status
    $record.values.Status = 'Working'

    // Save the case
    return Compose.makeRecord({
      CaseId: $record.recordID,
      Description: 'State set to "Working"',
      Type: 'State change'
    }, 'CaseUpdate').then(async myCaseUpdate => {
      await Compose.saveRecord(myCaseUpdate)
      return await Compose.saveRecord($record)
    })
  }
}
