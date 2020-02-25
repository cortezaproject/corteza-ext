export default {
  label: 'Set label for Lead',
  description: 'Set record label for lead',

  * triggers ({ before }) {
    yield before('create', 'update')
      .for('compose:record')
      .where('module', 'Lead')
      .where('namespace', 'crm')
  },

  async exec ({ $record }) {
    // Set the record label string
    let recordLabel = ''

    // Get the first name
    let firstName = $record.values.FirstName
    if (!firstName) {
      firstName = ''
    }

    // Get the last name
    let lastName = $record.values.LastName
    if (!lastName) {
      lastName = ''
    }

    // Create the full name
    if ((firstName !== '') && (lastName === '')) {
      recordLabel = firstName
    }

    if ((firstName === '') && (lastName !== '')) {
      recordLabel = lastName
    }

    if ((firstName !== '') && (lastName !== '')) {
      recordLabel = firstName + ' ' + lastName
    }

    // Get the company name
    let company = $record.values.Company
    if (!company) {
      company = ''
    }

    // Add the company name (if there is one)
    if (company !== '') {
      recordLabel = recordLabel + ' (' + company + ')'
    }

    // Set the label
    $record.values.RecordLabel = recordLabel
    return $record
  }
}
