export default {
  label: 'Set case time and cost to update',
  description: 'Sets time and cost of a case by summing up the cost of all case updates',

  * triggers ({ before }) {
    yield before('create', 'update')
      .for('compose:record')
      .where('module', 'Update')
      .where('namespace', 'service-solution')
  },

  async exec ({ $record }, { Compose }) {
    /**
     * Outline of the script:
     *    * calculate the new cost of this update,
     *    * calculate total time & cost for the given case,
     *    * calculate total time & cost for the given account,
     *    * calculate total time & cost for the given product,
     *    * calculate total time & cost for the given department.
     *
     * Take care to include the current record as well
     */

    // New cost
    let departmentRecord
    if ($record.values.Department) {
      departmentRecord = await Compose.findRecordByID($record.values.Department, 'Department')

      // Time
      let time = $record.values.TimeSpend
      if (!time || isNaN(time)) {
        time = 0
      }

      // Cost
      let cost = departmentRecord.values.HourCost
      if (!cost || isNaN(cost)) {
        cost = 0
      }

      $record.values.Cost = time * cost
    } else {
      // If no department, there is no cost
      $record.values.Cost = 0
    }

    // The given case
    const caseRecord = await Compose.findRecordByID($record.values.CaseId, 'Case')
    const { set: updates = [] } = await Compose.findRecords(`(CaseId = ${$record.values.CaseId}) AND (id != ${$record.recordID})`, 'Update')
      .catch(() => ({ set: [] }))

    updates.push($record)
    let caseTime = 0
    let caseCost = 0

    // Sum up the totals for this case
    updates.forEach(r => {
      // Time
      let caseUpdateTime = r.values.TimeSpend
      if (!caseUpdateTime || isNaN(caseUpdateTime)) {
        caseUpdateTime = 0
      }
      caseTime += parseFloat(caseUpdateTime)

      // Cost
      let caseUpdateCost = r.values.Cost
      if (!caseUpdateCost || isNaN(caseUpdateCost)) {
        caseUpdateCost = 0
      }
      caseCost += parseFloat(caseUpdateCost)
    })

    // Update values
    caseRecord.values.TotalTime = caseTime
    caseRecord.values.TotalCost = caseCost
    await Compose.saveRecord(caseRecord)

    // The given account
    if (caseRecord.values.AccountId) {
      const accountRecord = await Compose.findRecordByID(caseRecord.values.AccountId, 'Account')
      const { set: cases = [] } = await Compose.findRecords(`AccountId = ${accountRecord.recordID}`, 'Case')
        .catch(() => ({ set: [] }))

      caseTime = 0
      caseCost = 0

      // Sum up the totals for this account
      cases.forEach(r => {
        // Time
        let caseUpdateTime = r.values.TotalTime
        if (!caseUpdateTime || isNaN(caseUpdateTime)) {
          caseUpdateTime = 0
        }
        caseTime += parseFloat(caseUpdateTime)

        // Cost
        let caseUpdateCost = r.values.TotalCost
        if (!caseUpdateCost || isNaN(caseUpdateCost)) {
          caseUpdateCost = 0
        }
        caseCost += parseFloat(caseUpdateCost)
      })

      // Update the values
      accountRecord.values.TotalTime = caseTime
      accountRecord.values.TotalCost = caseCost
      await Compose.saveRecord(accountRecord)
    }

    // The given product
    if (caseRecord.values.ProductId) {
      const productRecord = await Compose.findRecordByID(caseRecord.values.ProductId, 'Product')
      const { set: cases = [] } = await Compose.findRecords(`ProductId = ${productRecord.recordID}`, 'Case')
        .catch(() => ({ set: [] }))

      caseTime = 0
      caseCost = 0

      // Sum up the totals for this account
      cases.forEach(r => {
        // Time
        let caseUpdateTime = r.values.TotalTime
        if (!caseUpdateTime || isNaN(caseUpdateTime)) {
          caseUpdateTime = 0
        }
        caseTime += parseFloat(caseUpdateTime)

        // Cost
        let caseUpdateCost = r.values.TotalCost
        if (!caseUpdateCost || isNaN(caseUpdateCost)) {
          caseUpdateCost = 0
        }
        caseCost += parseFloat(caseUpdateCost)
      })

      // Update values
      productRecord.values.TotalTime = caseTime
      productRecord.values.TotalCost = caseCost
      await Compose.saveRecord(productRecord)
    }

    // The given department
    if (departmentRecord) {
      const { set: updates = [] } = await Compose.findRecords(`(Department = ${$record.values.Department}) AND (id != ${$record.recordID})`, 'Update')
        .catch(() => ({ set: [] }))

      updates.push($record)
      let departmentTime = 0
      let departmentCost = 0

      // Sum up the totals for this department
      updates.forEach(r => {
        // Time
        let departmentUpdateTime = r.values.TimeSpend
        if (!departmentUpdateTime || isNaN(departmentUpdateTime)) {
          departmentUpdateTime = 0
        }
        departmentTime += parseFloat(departmentUpdateTime)

        // Cost
        let departmentUpdateCost = r.values.Cost
        if (!departmentUpdateCost || isNaN(departmentUpdateCost)) {
          departmentUpdateCost = 0
        }
        departmentCost += parseFloat(departmentUpdateCost)
      })

      // Set the values in the department
      departmentRecord.values.TotalTime = departmentTime
      departmentRecord.values.TotalCost = departmentCost
      await Compose.saveRecord(departmentRecord)
    }

    return $record
  }
}
