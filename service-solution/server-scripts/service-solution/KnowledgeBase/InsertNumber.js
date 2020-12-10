export default {
  label: 'Insert knowledgebase number',
  description: 'Inserts next Knowledge base number',

  * triggers ({ before }) {
    yield before('create', 'update')
      .for('compose:record')
      .where('module', 'KnowledgeBase')
      .where('namespace', 'service-solution')
  },

  async exec ({ $record }, { Compose }) {
    const settings = await Compose.findLastRecord('Settings')

    // Map the case number
    let KBNextNumber = settings.values.KBNextNumber
    if (!KBNextNumber || isNaN(KBNextNumber)) {
      KBNextNumber = 0
    }

    $record.values.Number = KBNextNumber

    settings.values.KBNextNumber = parseInt(KBNextNumber, 10) + 1
    await Compose.saveRecord(settings)
    return $record
  }
}
