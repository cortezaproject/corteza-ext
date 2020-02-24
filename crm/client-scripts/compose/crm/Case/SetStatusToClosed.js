export default {
  name: 'SetStatusToClosed',
  label: 'Set case status to closed',
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
    // Check if the case is already closed
    if ($record.values.Status === 'Closed') {
      // Case is closed already. Exit
      ComposeUI.success('This case is already closed.')
      return true
    }

    // Check if there is a solution
    const solutionName = $record.values.SolutionName
    const solutionRecord = $record.values.SolutionId
    const submitAsSolution = $record.values.SubmitAsSolution

    // If there is no solution, show that it's not possible to close the case
    if (!solutionName && !solutionRecord && !submitAsSolution) {
      ComposeUI.warning('Unable to close the case. Please add a solution name or select an existing solution before closing the case.')
      return
    }
    // Update the status
    $record.values.IsClosed = true
    $record.values.ClosedDate = this.getTimestamp()
    $record.values.Status = 'Closed'
    await Compose.saveRecord($record)

    // Create the CaseUpdate record
    return Compose.makeRecord({
      Description: 'State set to "Closed',
      Type: 'State change',
      CaseId: $record.recordID
    }, 'CaseUpdate')
      .then(async myCaseUpdate => {
        await Compose.saveRecord(myCaseUpdate)

        // Check if a solution record has been selected
        if (solutionRecord) {
          // If there is a solution record, map the values in the case
          const solution = await Compose.findRecordByID(solutionRecord, 'Solution')
          $record.values.SolutionName = solution.values.SolutionName
          $record.values.SolutionNote = solution.values.SolutionNote
          $record.values.SolutionFile = solution.values.File
          return await Compose.saveRecord($record)
        } else {
          // If there is no solution record, check if the value "SubmitAsSolution" is checked. If so, save the solution as a Solution record
          if ($record.values.SubmitAsSolution) {
            // Get the default settings
            const settings = await Compose.findLastRecord('Settings')
            // Map the solution number
            let nextSolutionNumber = settings.values.SolutionNextNumber
            if (!nextSolutionNumber || isNaN(nextSolutionNumber)) {
              nextSolutionNumber = 0
            }
            // Create the Solution record
            return Compose.makeRecord({
              SolutionName: $record.values.SolutionName,
              SolutionNote: $record.values.SolutionNote,
              File: $record.values.SolutionFile,
              Status: 'New',
              IsPublished: '1',
              CaseId: $record.recordID,
              SolutionNumber: nextSolutionNumber,
              ProductId: $record.values.ProductId
            }, 'Solution')
              .then(async mySolution => {
                const mySavedSolution = await Compose.saveRecord(mySolution)

                // Update the config
                const nextSolutionNumberUpdated = parseInt(nextSolutionNumber, 10) + 1
                settings.values.SolutionNextNumber = nextSolutionNumberUpdated
                await Compose.saveRecord(settings)

                // Save the solution record in the case record
                $record.values.SolutionId = mySavedSolution.recordID
                return await Compose.saveRecord($record)
              })
          }
        }
      })
  }
}
