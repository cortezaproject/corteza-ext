// SPDX-FileCopyrightText: 2020, Tomaž Jerman
// SPDX-License-Identifier: Apache-2.0

export async function loadCreds (Compose) {
  return Compose.findFirstRecord('ext_docusign_configuration')
    .then(({ values }) => values)
}
