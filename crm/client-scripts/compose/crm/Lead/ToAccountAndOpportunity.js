export default {
  name: 'ToAccountAndOpportunity',
  label: 'Converts lead to account and opportunity',
  description: 'Creates an account ad opportunity fron an existing lead',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .where('module', 'Lead')
  },

  getTimestamp (opportunityCloseDays) {
    const m = new Date()
    m.setDate(m.getDate() + parseInt(opportunityCloseDays, 10))
    return m.toISOString()
  },

  async exec ({ $record }, { Compose, ComposeUI, System }) {
    if ($record.values.Status === 'Converted') {
      // Lead already converted. Inform user and exit
      ComposeUI.warning('This lead is already converted.')
      return true
    }

    // create new record of type/module Account and copy all values
    return Compose.makeRecord({
      BillingStreet: $record.values.Street,
      BillingCity: $record.values.City,
      BillingState: $record.values.State,
      BillingPostalCode: $record.values.PostalCode,
      BillingCountry: $record.values.Country,
      AnnualRevenue: $record.values.AnnualRevenue,
      AccountName: $record.values.Company,
      Description: $record.values.Description,
      Fax: $record.values.Fax,
      Industry: $record.values.Industry,
      OwnerId: $record.values.OwnerId,
      AccountSource: $record.values.LeadSource,
      Phone: $record.values.Phone,
      NumberOfEmployees: $record.values.NumberOfEmployees,
      Rating: $record.values.Rating,
      Website: $record.values.Website,
      Twitter: $record.values.Twitter,
      Facebook: $record.values.Facebook,
      LinkedIn: $record.values.LinkedIn
    }, 'Account').then(async myAccount => {
      const mySavedAccount = await Compose.saveRecord(myAccount)
      // Create the related contact
      return Compose.makeRecord({
        MailingStreet: $record.values.Street,
        MailingCity: $record.values.City,
        MailingState: $record.values.State,
        MailingPostalCode: $record.values.PostalCode,
        MailingCountry: $record.values.Country,
        Description: $record.values.Description,
        DoNotCall: $record.values.DoNotCall,
        Email: $record.values.Email,
        HasOptedOutOfEmail: $record.values.HasOptedOutOfEmail,
        Fax: $record.values.Fax,
        HasOptedOutOfFax: $record.values.HasOptedOutOfFax,
        OwnerId: $record.values.OwnerId,
        LeadSource: $record.values.LeadSource,
        Website: $record.values.Website,
        Twitter: $record.values.Twitter,
        Facebook: $record.values.Facebook,
        LinkedIn: $record.values.LinkedIn,
        Salutation: $record.values.Salutation,
        FirstName: $record.values.FirstName,
        LastName: $record.values.LastName,
        MobilePhone: $record.values.MobilePhone,
        Phone: $record.values.Phone,
        Title: $record.values.Title,
        IsPrimary: '1',
        AccountId: mySavedAccount.recordID
      }, 'Contact').then(async mySavedContact => {
        await Compose.saveRecord(mySavedContact)
        // First get the default values
        // Get the default settings
        return Compose.findLastRecord('Settings').then(settings => {
          const opportunityCloseDays = settings.values.OpportunityCloseDateDays
          const opportunityProbability = settings.values.OpportunityProbability
          const opportunityForecaseCategory = settings.values.OpportunityForecaseCategory
          const opportunityStagename = settings.values.OpportunityStagename

          // Calculate the expiration date
          const closeDate = this.getTimestamp(opportunityCloseDays)

          // Create the related opportunity
          return Compose.makeRecord({
            Description: $record.values.Description,
            OwnerId: $record.values.OwnerId,
            LeadSource: $record.values.LeadSource,
            Name: '(unnamed)',
            AccountId: mySavedAccount.recordID,
            IsClosed: 'No',
            IsWon: 'No',
            CloseDate: closeDate,
            Probability: opportunityProbability,
            ForecastCategory: opportunityForecaseCategory,
            StageName: opportunityStagename
          }, 'Opportunity').then(async myOpportunity => {
            const mySavedOpportunity = await Compose.saveRecord(myOpportunity)
            // Create a new contact linked to the opportunity
            return Compose.makeRecord({
              ContactId: mySavedContact.recordID,
              OpportunityId: mySavedOpportunity.recordID,
              IsPrimary: '1'
            }, 'OpportunityContactRole').then(async myOpportunityContactRole => {
              await Compose.saveRecord(myOpportunityContactRole)
            })
          })
        })
      }).then(async () => {
        // Update the lead record
        $record.values.Status = 'Converted'
        $record.values.IsConverted = 'Yes'
        $record.values.ConvertedAccountId = mySavedAccount.recordID
        $record.values.ConvertedContactId = mySavedAccount.recordID
        $record.values.ConvertedDate = mySavedAccount.createdAt

        await Compose.saveRecord($record)
        const user = await System.findUserByID($record.values.OwnerId)
        // Notifies the owner that a new account was created and assigned to him
        Compose.sendRecordToMail(
          user.email,
          `Lead ${$record.values.FirstName} ${$record.values.LastName} from ${$record.values.Company} has been converted`,
          {
            header: '<h1>The following lead has been converted:</h1>'
          },
          mySavedAccount
        )

        // Notify current user
        ComposeUI.success('The lead has been converted.')

        // Go to the record
        ComposeUI.gotoRecordEditor(mySavedAccount)
      })
    })
  }
}
