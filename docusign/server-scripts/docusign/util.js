export async function loadCreds (Compose) {
  return Compose.findFirstRecord('ext_docusign_configuration')
    .then(({ values }) => values)
}
