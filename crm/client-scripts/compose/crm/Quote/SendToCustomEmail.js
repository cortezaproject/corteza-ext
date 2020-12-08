import { quoteToHTML } from '../../../../lib/quote/util'

export default {
  label: 'Send this Quote to a custom email',
  description: 'Sends quote email to custom address',

  * triggers ({ on }) {
    yield on('manual')
      .for('compose:record')
      .where('module', 'Quote')
      .where('namespace', 'crm')
      .uiProp('app', 'compose')
  },

  prompt (text, defaultText) {
    return window.prompt(text, defaultText)
  },

  async exec ({ $record }, { Compose, ComposeUI }) {
    // Get the to address
    const to = this.prompt('Please enter an email to send this quote to:')
    if (!to) {
      throw new Error('Please enter an email to send this quote to .')
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
