export default {
  label: 'Update Lead Campaigns after creation or update',
  description: 'Update related Campaigns after a Lead is created, updated or deleted',

  * triggers ({ after }) {
    yield after('create', 'update', 'delete')
      .for('compose:record')
      .where('module', 'Lead')
      .where('namespace', 'crm')
  },

  async exec ({ $record, $oldRecord, $module, $namespace }, { Compose, ComposeAPI }) {
    let campaignIDs = []
    if ($record && $record.values.CampaignId) {
      campaignIDs.push(...$record.values.CampaignId)
    }
    if ($oldRecord && $oldRecord.values.CampaignId) {
      campaignIDs.push(...$oldRecord.values.CampaignId)
    }

    campaignIDs = [...new Set(campaignIDs)]

    if (!campaignIDs.length) { return $record }

    // Make campaign filter
    const campaignFilter = campaignIDs.map(cID => {
      return `recordID = '${cID}'`
    }).join(' OR ')

    const reportFilter = {
      namespaceID: $namespace.namespaceID,
      moduleID: $module.moduleID,
      dimensions: `DATE_FORMAT(created_at, '%Y-01-01')`,
      metrics: '',
    }

    if (campaignFilter) {
      await Compose.findRecords(campaignFilter, 'Campaigns')
        .catch(() => ({ set: [] }))
        .then(({ set }) => {
          return Promise.all(set.map(async campaign => {
            await ComposeAPI.recordReport({ ...reportFilter, filter: `CampaignId = '${campaign.recordID}'` })
              .catch(() => ([]))
              .then(response => {
                campaign.values.NumberOfLeads = response.reduce((a, b) => a + (b.count || 0), 0)
              })

            await ComposeAPI.recordReport({ ...reportFilter, filter: `(CampaignId = '${campaign.recordID}') AND IsConverted` })
              .catch(() => ([]))
              .then(response => {
                campaign.values.NumberOfConvertedLeads = response.reduce((a, b) => a + (b.count || 0), 0)
              })

            return Compose.saveRecord(campaign)
          }))
        })
    }

    return $record
  }
}
