export default {
  name: 'ToAccount',
  label: 'Converts lead to account',
  description: 'Creates an account from an existing lead',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .where('module', 'Lead')
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
      Description: $record.values.Description,
      AccountName: $record.values.Company,
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
      }, 'Contact').then(async myContact => {
        await Compose.saveRecord(myContact)

        // Update the lead record
        $record.values.Status = 'Converted'
        $record.values.IsConverted = 'Yes'
        $record.values.ConvertedAccountId = mySavedAccount.recordID
        $record.values.ConvertedContactId = mySavedAccount.recordID
        $record.values.ConvertedDate = mySavedAccount.createdAt

        await Compose.saveRecord($record)
        System.findUserByID($record.values.OwnerId).then(user => {
          // Notifies the owner that a new account was created and assigned to him
          Compose.sendRecordToMail(
            user.email,
            `Lead ${$record.values.FirstName} ${$record.values.LastName} from ${$record.values.Company} has been converted`,
            {
              header: '<h1>The following lead has been converted:</h1>'
            },
            mySavedAccount
          )
        })

        ComposeUI.success('The lead has been converted.')

        // Go to the record
        ComposeUI.gotoRecordEditor(mySavedAccount)
      })
    })
  }
}
