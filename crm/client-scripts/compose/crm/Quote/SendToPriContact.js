import { quoteToHTML } from '../../../../lib/quote/util'

export default {
  label: 'Send this Quote via email to the primary contact',
  description: 'Sends quote to primary contact',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .where('module', 'Quote')
      .where('namespace', 'crm')
      .uiProp('app', 'compose')
  },

  async exec ({ $record }, { Compose, ComposeUI }) {
    // Get the to address
    const to = $record.values.Email
    if (!to) {
      ComposeUI.warning('There is no email linked to the quote. Please fill in an email address in the "Primary contact data" block.')
      return
    }

    const lineItems = await Compose.findRecords(`QuoteId = ${$record.recordID}`, 'QuoteLineItem')
      .then(({ set: lineItems }) => lineItems)

    const html = quoteToHTML($record, lineItems)
    await Compose.sendMail(
      to,
      `Corteza - Quote: ${$record.values.QuoteNumber} - ${$record.values.Name}`,
      { html }
    )
    ComposeUI.success('The quote has been sent via email.')
  }
}
