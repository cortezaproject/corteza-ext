import { genericMapper } from './lib'

export default {
  primary_email: { email_address: 'Email' },
  first_name: 'FirstName',
  last_name: 'LastName',
  primary_phone: {
    raw_phone: 'Phone',
    label: 'PhoneLabel',
  },
  primary_address: {
    city: 'City',
    state: 'State',
    zip: 'PostalCode',
    country: 'Country',
  },
  custom_fields: genericMapper,
}
