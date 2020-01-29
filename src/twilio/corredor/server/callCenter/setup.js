import twClient from '../shared/twClient'
import { compose } from '@cortezaproject/corteza-js'

export default {
  label: 'Call Center Setup',
  description:
`This automation script handles operations related to call center creation and updates.
A call center is just a Twilio phone number with a set of metadata that allows personalized operations.`,
  triggers (t) {
    return [
      t.after('create')
        .for('compose:record')
        .where('module', ['ext_twilio_call_center']),

      t.after('update')
        .for('compose:record')
        .where('module', ['ext_twilio_call_center']),
    ]
  },

  async exec ({ $record, $module }, ctx) {
    $record = new compose.Record($record, $module)
    const twilio = await twClient(ctx.Compose)
    const ws = await ctx.Compose.findRecordByID($record.values.Workspace, 'ext_twilio_workspace')

    // Update corresponding phone number for the given call center
    await twilio.incomingPhoneNumbers($record.values.PhoneNumberSid)
      .update({
        friendlyName: $record.values.Name,
        voiceUrl: `${$record.values.CallWebhook.replace(/[/ ]+$/g, '')}?workspaceSid=${ws.values.WorkspaceSid}&workflowSid=${ws.values.WorkflowSid}&callCenterID=${$record.recordID}`,
      })
  },
}
