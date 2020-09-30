export default {
  label: 'Update Campaigns after creation or update',
  description: 'Update related Campaigns after a Opportunity is created or updated',

  * triggers ({ after }) {
    yield after('create', 'update')
      .for('compose:record')
      .where('module', 'Opportunity')
      .where('namespace', 'crm')
  },

  async exec ({ $record, $oldRecord, $module, $namespace }, { Compose, ComposeAPI }) {
    if ($record.values.CampaignId || $oldRecord.values.CampaignId) {
      // Get unique campagin IDs, include old IDs so we can properly update campaigns
      const campaignIDs = [
        ...new Set([
          $record.values.CampaignId,
          $oldRecord.values.CampaignId
        ].filter(cID => cID))
      ]

      // Make campaign filter
      const campaignFilter = campaignIDs.map(cID => {
        return `recordID = '${cID}'`
      }).join(' OR ')

      const reportFilter = {
        namespaceID: $namespace.namespaceID,
        moduleID: $module.moduleID,
        dimensions: `DATE_FORMAT(created_at, '%Y-01-01')`,
        metrics: 'sum(Amount) AS amount',
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

              await ComposeAPI.recordReport({ ...reportFilter, metricsfilter: `(CampaignId = '${campaign.recordID}') AND IsWon` })
                .catch(() => ([]))
                .then(response => {
                  campaign.values.NumberOfWonOpportunities = response.reduce((a, b) => a + (b.count || 0), 0)
                  campaign.values.AmountWonOpportunities = response.reduce((a, b) => a + (b.amount || 0), 0)
                })

              return Compose.saveRecord(campaign)
            }))
          })
      }
    }

    return $record
  }
}
