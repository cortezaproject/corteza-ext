export default {
  name: 'InsertNumber',
  label: 'Insert knowledgebase number',
  description: 'Inserts next Knowledge base number',

  * triggers ({ before }) {
    yield before('create', 'update')
      .for('compose:record')
      .where('module', 'KnowledgeBase')
      .where('namespace', 'service-cloud')
  },

  async exec ({ $record }, { Compose }) {
    // Get the default settings
    return Compose.findLastRecord('Settings').then(async settings => {
      // Map the case number
      let KBNextNumber = settings.values.KBNextNumber
      if (typeof KBNextNumber === 'undefined' || KBNextNumber === '' || isNaN(KBNextNumber)) {
        KBNextNumber = 0
      }

      $record.values.Number = KBNextNumber
      const KBNextNumberUpdated = parseInt(KBNextNumber, 10) + 1

      // Update the config
      settings.values.KBNextNumber = KBNextNumberUpdated
      const mySavedSettings = await Compose.saveRecord(settings)
      console.log('Record saved, new ID', mySavedSettings.recordID)
      return $record
    }).catch(({ message }) => {
      throw new Error(message)
    })
  }
}
