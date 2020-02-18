export default {
  name: 'CreateNewOpportunity',
  label: 'Creates new opportunity from an account',
  description: 'Creates new record in Opportunity module for the specified account',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .where('module', 'Account')
      .where('namespace', 'crm')
  },

  getTimestamp (opportunityCloseDays) {
    const m = new Date()
    m.setDate(m.getDate() + parseInt(opportunityCloseDays, 10))
    return m.getUTCFullYear() + '/' + (m.getUTCMonth() + 1) + '/' + m.getUTCDate() + ' ' + m.getUTCHours() + ':' + m.getUTCMinutes() + ':' + m.getUTCSeconds()
  },

  async exec ({ $record }, { Compose, ComposeUI }) {
    // Get the default settings
    return Compose.findLastRecord('Settings').then(settings => {
      const opportunityCloseDays = settings.values.OpportunityCloseDateDays
      const opportunityProbability = settings.values.OpportunityProbability
      const opportunityForecaseCategory = settings.values.OpportunityForecaseCategory
      const opportunityStagename = settings.values.OpportunityStagename

      // Calculate the expiration date
      const closeDate = this.getTimestamp(opportunityCloseDays)

      // Find the contact we want to link the new case to (by default, the primary contact)
      return Compose.findRecords(`AccountId = ${$record.recordID}`, 'Contact')
      .then(({ set }) => {
        let ContactId

        // Loop through the contacts of the account, to save the primary contact
        set.forEach(r => {
          // Check if it's the primary contact
            if (r.values.IsPrimary === '1') {
              // Add the contact
              ContactId = r.recordID
            }
          })
          
          // Create the related opportunity
          return Compose.makeRecord({
            OwnerId: $record.values.OwnerId,
            LeadSource: $record.values.LeadSource,
            Name: '(unnamed)',
            AccountId: $record.recordID,
            IsClosed: 'No',
            IsWon: 'No',
            CloseDate: closeDate,
            Probability: opportunityProbability,
            ForecastCategory: opportunityForecaseCategory,
            StageName: opportunityStagename
          }, 'Opportunity')
          .then(async myOpportunity => {
              const mySavedOpportunity = await Compose.saveRecord(myOpportunity)

              // Create a new contact linked to the opportunity
              return Compose.makeRecord({
                ContactId: ContactId,
                OpportunityId: mySavedOpportunity.recordID,
                IsPrimary: '1'
              }, 'OpportunityContactRole')
                .then(async myOpportunityContactRole => {
                  await Compose.saveRecord(myOpportunityContactRole)

                  // Notify current user
                  ComposeUI.success('The new opportunity has been created.')

                  // Go to the record
                  ComposeUI.gotoRecordEditor(mySavedOpportunity)

                  return mySavedOpportunity
                }).catch(({ message }) => {
                  throw new Error(message)
                })
            }).catch(({ message }) => {
              throw new Error(message)
            })
        }).catch(({ message }) => {
          throw new Error(message)
        })
    }).catch(({ message }) => {
      throw new Error(message)
    })
  }
}
