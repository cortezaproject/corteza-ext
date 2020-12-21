import { getTimestamp, toAccountContact } from '../../../../lib/lead/util'

export default {
  label: 'Convert this Lead into an Account and Opportunity',
  description: 'Creates an Account and Opportunity from an existing Lead',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .where('module', 'Lead')
      .where('namespace', 'crm')
      .uiProp('app', 'compose')
  },

  async exec ({ $record }, { Compose, ComposeUI, System }) {
    if ($record.values.Status === 'Converted') {
      ComposeUI.warning('This lead is already converted.')
      return
    }

    const settings = await Compose.findLastRecord('Settings')
    const { account, contact } = await toAccountContact($record, Compose)

    const opportunity = await Compose.saveRecord(Compose.makeRecord({
      Description: $record.values.Description,
      OwnerId: $record.values.OwnerId,
      LeadSource: $record.values.LeadSource,
      Name: '(unnamed)',
      AccountId: account.recordID,
      IsClosed: 'No',
      IsWon: 'No',
      CloseDate: getTimestamp(settings.values.OpportunityCloseDateDays),
      Probability: settings.values.OpportunityProbability,
      ForecastCategory: settings.values.OpportunityForecaseCategory,
      StageName: settings.values.OpportunityStagename,
      CampaignId: $record.values.CampaignId[0]
    }, 'Opportunity'))

    // Create a new contact linked to the opportunity
    await Compose.saveRecord(Compose.makeRecord({
      ContactId: contact.recordID,
      OpportunityId: opportunity.recordID,
      IsPrimary: '1'
    }, 'OpportunityContactRole'))

    // Update the lead
    $record.values.Status = 'Converted'
    $record.values.IsConverted = 'Yes'
    $record.values.ConvertedAccountId = account.recordID
    $record.values.ConvertedContactId = contact.recordID
    $record.values.ConvertedOpportunityId = opportunity.recordID
    $record.values.ConvertedDate = account.createdAt.toISOString()
    await Compose.saveRecord($record)

    // Notify the owner
    if ($record.values.OwnerId) {
      const owner = await System.findUserByID($record.values.OwnerId)
      await Compose.sendRecordToMail(
        owner.email,
        `Lead ${$record.values.FirstName} ${$record.values.LastName} from ${$record.values.Company} has been converted`,
        {
          header: '<h1>The following lead has been converted:</h1>'
        },
        account
      )
    }

    ComposeUI.success('The lead has been converted.')
    ComposeUI.gotoRecordViewer(opportunity)
  }
}
