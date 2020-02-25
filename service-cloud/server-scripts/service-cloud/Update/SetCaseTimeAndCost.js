export default {
  label: 'Set case time and cost to update',
  description: 'Sets time and cost of a case by summing up the cost of all case updates',

  * triggers ({ before }) {
    yield before('create', 'update')
      .for('compose:record')
      .where('module', 'Update')
      .where('namespace', 'service-cloud')
  },

  async exec ({ $record }, { Compose }) {
    // Find the related case
    return Compose.findRecordByID($record.values.CaseId, 'Case')
      .then(caseRecord => {
        // Find all updates in the case
        return Compose.findRecords(`CaseId = ${$record.values.CaseId}`, 'Update')
          .then(async ({ set }) => {
            // Start the time and cost with the values of the current update, because the update
            // is not saved until after the complete script has run
            let caseTime = 0
            let caseCost = 0

            // Loop through the updates of the case, to sum the totals
            set.forEach(r => {
              // Get the time
              let caseUpdateTime = r.values.TimeSpend
              if (!caseUpdateTime || isNaN(caseUpdateTime)) {
                caseUpdateTime = 0
              }
              caseTime = parseFloat(caseTime) + parseFloat(caseUpdateTime)

              // Get the cost
              let caseUpdateCost = r.values.Cost
              if (!caseUpdateCost || isNaN(caseUpdateCost)) {
                caseUpdateCost = 0
              }
              caseCost = parseFloat(caseCost) + parseFloat(caseUpdateCost)
            })

            // Set the values in the case
            caseRecord.values.TotalTime = caseTime
            caseRecord.values.TotalCost = caseCost

            // Save the case
            await Compose.saveRecord(caseRecord)

            // After saving the case, update the total for the account
            // Find the related case
            if (caseRecord.values.AccountId) {
              Compose.findRecordByID(caseRecord.values.AccountId, 'Account').then(accountRecord => {
                // Find all updates in the case
                return Compose.findRecords(`AccountId = ${accountRecord.recordID}`, 'Case')
                  .then(async ({ set }) => {
                    // Start the time and cost with the values of the current update, because the update
                    // is not saved until after the complete script has run
                    caseTime = 0
                    caseCost = 0

                    // Loop through the updates of the case, to sum the totals
                    set.forEach(r => {
                      // Get the time
                      let caseUpdateTime = r.values.TotalTime
                      if (!caseUpdateTime || isNaN(caseUpdateTime)) {
                        caseUpdateTime = 0
                      }
                      caseTime = parseFloat(caseTime) + parseFloat(caseUpdateTime)

                      // Get the cost
                      let caseUpdateCost = r.values.TotalCost
                      if (!caseUpdateCost || isNaN(caseUpdateCost)) {
                        caseUpdateCost = 0
                      }
                      caseCost = parseFloat(caseCost) + parseFloat(caseUpdateCost)
                    })

                    // Set the values in the case
                    accountRecord.values.TotalTime = caseTime
                    accountRecord.values.TotalCost = caseCost

                    // Save the case
                    await Compose.saveRecord(accountRecord)
                  })
              })
            }

            // Add the totals for the related product
            // After saving the case, update the total for the account
            // Find the related case
            if (caseRecord.values.ProductId) {
              Compose.findRecordByID(caseRecord.values.ProductId, 'Product').then(productRecord => {
                // Find all updates in the case
                return Compose.findRecords(`ProductId = ${productRecord.recordID}`, 'Case')
                  .then(async ({ set }) => {
                    // Start the time and cost with the values of the current update, because the update
                    // is not saved until after the complete script has run
                    caseTime = 0
                    caseCost = 0

                    // Loop through the updates of the case, to sum the totals
                    set.forEach(r => {
                      // Get the time
                      let caseUpdateTime = r.values.TotalTime
                      if (!caseUpdateTime || isNaN(caseUpdateTime)) {
                        caseUpdateTime = 0
                      }
                      caseTime = parseFloat(caseTime) + parseFloat(caseUpdateTime)

                      // Get the cost
                      let caseUpdateCost = r.values.TotalCost
                      if (!caseUpdateCost || isNaN(caseUpdateCost)) {
                        caseUpdateCost = 0
                      }
                      caseCost = parseFloat(caseCost) + parseFloat(caseUpdateCost)
                    })

                    // Set the values in the case
                    productRecord.values.TotalTime = caseTime
                    productRecord.values.TotalCost = caseCost

                    // Save the case
                    await Compose.saveRecord(productRecord)
                })
              })
            }

            // Add the totals for the department
            // If there is an department, update the total for that department
            if ($record.values.Department) {
              Compose.findRecordByID($record.values.Department, 'Department').then(departmentRecord => {
                // Find all updates of the department (to run through them and update the totals)
                return Compose.findRecords(`Department = ${$record.values.Department}`, 'Update')
                  .then(async ({ set }) => {
                    let departmentTime = 0
                    let departmentCost = 0

                    // Loop through the updates of the department, to sum the totals
                    set.forEach(r => {
                      // Get the time
                      let departmentUpdateTime = r.values.TimeSpend
                      if (!departmentUpdateTime || isNaN(departmentUpdateTime)) {
                        departmentUpdateTime = 0
                      }
                      departmentTime = parseFloat(departmentTime) + parseFloat(departmentUpdateTime)

                      // Get the cost
                      let departmentUpdateCost = r.values.Cost
                      if (!departmentUpdateCost || isNaN(departmentUpdateCost)) {
                        departmentUpdateCost = 0
                      }
                      departmentCost = parseFloat(departmentCost) + parseFloat(departmentUpdateCost)
                    })

                    // Set the values in the department
                    departmentRecord.values.TotalTime = departmentTime
                    departmentRecord.values.TotalCost = departmentCost

                    // Save the department
                    await Compose.saveRecord(departmentRecord)
                  })
              })
            }
          })
      })
  }
}
