// SPDX-FileCopyrightText: 2020, Jože Fortun, Tomaž Jerman
// SPDX-License-Identifier: Apache-2.0

import DocuSignClient from '../../lib'
import { loadCreds } from './util'

export default {
  label: 'Cancel Quote E-Signature',
  description: 'Cancels Quote sent for signing',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .uiProp('app', 'compose')
  },

  async exec ({ $record }, { Compose }) {
    if ($record.values.DocuSignId) {
      const cfg = await loadCreds(Compose)
      const client = new DocuSignClient(cfg.AccessToken, cfg.AccountID, cfg.BaseURL, cfg.InProduction)

      await client.VoidEnvelope($record.values.DocuSignId)

      if ($record.values.OpportunityId) {
        await Compose.findRecordByID($record.values.OpportunityId, 'Opportunity')
          .then(async opportunityRecord => {
            opportunityRecord.values.SignatureStatus = 'voided'
            await Compose.saveRecord(opportunityRecord)
          })
      }
  
      $record.values.DocuSignId = undefined
      $record.values.SignatureStatus = 'voided'

      return Compose.saveRecord($record)
    } else {
      throw new Error('Cannot update E-Signature status for unexisting document')
    }
  }
}
