export default {
  label: 'Set Case status to Closed',
  description: 'Sets status of Case record to "Closed"',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .where('module', 'Case')
      .where('namespace', 'crm')
      .uiProp('app', 'compose')
  },

  getTimestamp () {
    const m = new Date()
    return m.toISOString()
  },

  async exec ({ $record }, { Compose, ComposeUI }) {
    if ($record.values.Status === 'Closed') {
      ComposeUI.success('This case is already closed.')
      return
    }

    // We can't close a case with no solution
    if (!$record.values.SolutionName && !$record.values.SolutionId && !$record.values.SubmitAsSolution) {
      ComposeUI.warning('Unable to close the case. Please add a solution name or select an existing solution before closing the case.')
      return
    }

    // Update the status
    $record.values.IsClosed = true
    $record.values.ClosedDate = this.getTimestamp()
    $record.values.Status = 'Closed'

    // Create an update
    await Compose.saveRecord(Compose.makeRecord({
      Description: 'State set to "Closed',
      Type: 'State change',
      CaseId: $record.recordID
    }, 'CaseUpdate'))

    // If there is a solution, map the values
    if ($record.values.SolutionId) {
      const solution = await Compose.findRecordByID($record.values.SolutionId, 'Solution')
      $record.values.SolutionName = solution.values.SolutionName
      $record.values.SolutionNote = solution.values.SolutionNote
      $record.values.SolutionFile = solution.values.File
      await Compose.saveRecord($record)
      return
    }

    // If the case is submitted as solution, create a solution.
    if ($record.values.SubmitAsSolution) {
      const settings = await Compose.findLastRecord('Settings')

      // Map the solution number
      let nextSolutionNumber = settings.values.SolutionNextNumber
      if (!nextSolutionNumber || isNaN(nextSolutionNumber)) {
        nextSolutionNumber = 0
      }

      // Create the Solution
      const solution = await Compose.saveRecord(Compose.makeRecord({
        SolutionName: $record.values.SolutionName,
        SolutionNote: $record.values.SolutionNote,
        File: $record.values.SolutionFile,
        Status: 'New',
        IsPublished: '1',
        CaseId: $record.recordID,
        SolutionNumber: nextSolutionNumber,
        ProductId: $record.values.ProductId
      }, 'Solution'))

      settings.values.SolutionNextNumber = parseInt(nextSolutionNumber, 10) + 1
      await Compose.saveRecord(settings)

      $record.values.SolutionId = solution.recordID
    }

    return Compose.saveRecord($record)
  }
}
