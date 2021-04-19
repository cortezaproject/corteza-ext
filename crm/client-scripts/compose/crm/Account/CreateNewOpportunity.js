// SPDX-FileCopyrightText: 2020, Jože Fortun, Tomaž Jerman, Denis Arh 
// SPDX-License-Identifier: Apache-2.0


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

  async exec ({ $record }, { Compose, ComposeUI }) {
    const settings = await Compose.findLastRecord('Settings')

    // Find the contact we want to link the new case to (by default, the primary contact)
    const contact = await Compose.findRecords(`AccountId = ${$record.recordID}`, 'Contact')
      .then(({ set: contacts }) => contacts.find(({ values }) => values.IsPrimary))

    if (!contact) {
      ComposeUI.warning('The primary contact is not defined.')
      return
    }

    const getTimestamp = (opportunityCloseDays) => {
      const m = new Date()
      m.setDate(m.getDate() + parseInt(opportunityCloseDays, 10))
      return m.toISOString()
    }

    // Create the opportunity
    const opportunity = await Compose.saveRecord(Compose.makeRecord({
      OwnerId: $record.values.OwnerId,
      LeadSource: $record.values.LeadSource,
      Name: '(unnamed)',
      AccountId: $record.recordID,
      IsClosed: 'No',
      IsWon: 'No',
      CloseDate: getTimestamp(settings.values.OpportunityCloseDateDays || 0),
      Probability: settings.values.OpportunityProbability,
      ForecastCategory: settings.values.OpportunityForecaseCategory,
      StageName: settings.values.OpportunityStagename,
      CampaignId: $record.values.CampaignId[0]
    }, 'Opportunity'))

    // Create a contact role
    await Compose.saveRecord(Compose.makeRecord({
      ContactId: contact.recordID,
      OpportunityId: opportunity.recordID,
      IsPrimary: '1'
    }, 'OpportunityContactRole'))

    ComposeUI.success('The new opportunity has been created.')
    ComposeUI.gotoRecordEditor(opportunity)
  }
}
