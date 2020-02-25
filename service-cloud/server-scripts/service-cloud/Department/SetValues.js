export default {
  label: 'Set values for department',
  description: 'On Department record, sets the value of DepartmentSelect to the value of Department Name',

  * triggers ({ before }) {
    yield before('create', 'update')
      .for('compose:record')
      .where('module', 'Department')
      .where('namespace', 'service-cloud')
  },

  async exec ({ $record }) {
    $record.values.DepartmentSelect = $record.values.Name
    return $record
  }
}
