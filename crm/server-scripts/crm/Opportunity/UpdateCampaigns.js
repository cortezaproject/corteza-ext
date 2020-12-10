export default {
  label: 'Update Opportunity Campaigns after creation or update',
  description: 'Update related Campaigns after a Opportunity is created, updated or deleted',

  * triggers ({ after }) {
    yield after('create', 'update', 'delete')
      .for('compose:record')
      .where('module', 'Opportunity')
      .where('namespace', 'crm')
  },

  async exec ({ $record, $oldRecord, $module, $namespace }, { Compose, ComposeAPI }) {
    let campaignIDs = new Set()
    if ($record && $record.values.CampaignId) {
      campaignIDs.add($record.values.CampaignId)
    }
    if ($oldRecord && $oldRecord.values.CampaignId) {
      campaignIDs.add($oldRecord.values.CampaignId)
    }

    campaignIDs = [...campaignIDs]

    if (!campaignIDs.length) { return $record }

    // Make campaign filter
    const campaignFilter = campaignIDs.map(cID => {
      return `recordID = '${cID}'`
    }).join(' OR ')

    const reportFilter = {
      namespaceID: $namespace.namespaceID,
      moduleID: $module.moduleID,
      dimensions: 'DATE_FORMAT(created_at, \'%Y-01-01\')',
      metrics: 'sum(Amount) AS amount'
    }

    if (campaignFilter) {
      await Compose.findRecords(campaignFilter, 'Campaigns')
        .catch(() => ({ set: [] }))
        .then(({ set }) => {
          return Promise.all(set.map(async campaign => {
            await ComposeAPI.recordReport({ ...reportFilter, filter: `CampaignId = '${campaign.recordID}'` })
              .catch(() => ([]))
              .then(response => {
                campaign.values.NumberOfOpportunities = response.reduce((a, b) => a + (b.count || 0), 0)
                campaign.values.AmountAllOpportunities = response.reduce((a, b) => a + (b.amount || 0), 0)
              })

            await ComposeAPI.recordReport({ ...reportFilter, filter: `(CampaignId = '${campaign.recordID}') AND (StageName = 'Closed Won')` })
              .catch(() => ([]))
              .then(response => {
                campaign.values.NumberOfWonOpportunities = response.reduce((a, b) => a + (b.count || 0), 0)
                campaign.values.AmountWonOpportunities = response.reduce((a, b) => a + (b.amount || 0), 0)
              })

            return Compose.saveRecord(campaign)
          }))
        })
    }

    return $record
  }
}
