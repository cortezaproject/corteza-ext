export default {
  label: 'Create new Opportunity from this Account',
  description: 'Creates new Opportunity record from an existing Account',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .where('module', 'Account')
      .where('namespace', 'crm')
      .uiProp('app', 'compose')
  },

  getTimestamp (opportunityCloseDays) {
    const m = new Date()
    m.setDate(m.getDate() + parseInt(opportunityCloseDays, 10))
    return m.toISOString()
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
      Compose.findRecords(`AccountId = ${$record.recordID}`, 'Contact')
      .catch(() => ({ set: [] }))
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
            StageName: opportunityStagename,
            CampaignId: $record.values.CampaignId[0],
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
                })
            })
        })
    })
  }
}
