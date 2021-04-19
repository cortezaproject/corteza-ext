// SPDX-FileCopyrightText: 2020, Tomaž Jerman 
// SPDX-License-Identifier: Apache-2.0

import {
  fieldKindMapping,
  phoneTypes,
  smAccountMapping
} from './lib'

/**
 * Provides mapping for contact module
 */
export default {
  Email: 'email',
  FirstName: 'first_name',
  LastName: 'last_name',
  Phone: 'phone',
  PhoneType: 'phone_type',
  PhoneLabel: 'phone_label',
  MobilePhone: [
    { list: 'additional_phone', key: 'number', meta: { phone_type: phoneTypes.cell } },
    { list: 'custom_fields', key: 'value', meta: { type: fieldKindMapping.String, name: 'mobile_phone' } }
  ],
  AssistantPhone: [
    { list: 'additional_phone', key: 'number', meta: { phone_type: phoneTypes.other } },
    { list: 'custom_fields', key: 'value', meta: { type: fieldKindMapping.String, name: 'assistant_phone' } }
  ],
  HomePhone: [
    { list: 'additional_phone', key: 'number', meta: { phone_type: phoneTypes.home } },
    { list: 'custom_fields', key: 'value', meta: { type: fieldKindMapping.String, name: 'home_phone' } }
  ],
  OtherPhone: [
    { list: 'additional_phone', key: 'number', meta: { phone_type: phoneTypes.other } },
    { list: 'custom_fields', key: 'value', meta: { type: fieldKindMapping.String, name: 'other_phone' } }
  ],
  MailingCity: 'city',
  MailingState: 'state',
  MailingPostalCode: 'zip',
  MailingCountry: 'country',

  Twitter: { list: 'social_accounts', key: 'account', meta: { type: smAccountMapping.twitter } },
  Facebook: { list: 'social_accounts', key: 'account', meta: { type: smAccountMapping.facebook } },
  LinkedIn: { list: 'social_accounts', key: 'account', meta: { type: smAccountMapping.linkedIn } }
}
