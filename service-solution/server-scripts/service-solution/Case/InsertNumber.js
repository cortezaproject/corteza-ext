export default {
  label: 'Insert case number',
  description: 'Sets case number based on timestamp',

  * triggers ({ before }) {
    yield before('create')
      .for('compose:record')
      .where('module', 'Case')
      .where('namespace', 'service-solution')
  },

  getCaseNumber () {
    const d = new Date()
    const y = d.getFullYear()
    let m = d.getMonth() + 1
    if (m < 10) {
      m = '0' + m
    }
    let day = d.getDate()
    if (day < 10) {
      day = '0' + day
    }
    let h = d.getHours()
    if (h < 10) {
      h = '0' + h
    }
    let min = d.getMinutes()
    if (min < 10) {
      min = '0' + min
    }
    let sec = d.getSeconds()
    if (sec < 10) {
      sec = '0' + sec
    }
    let mil = d.getMilliseconds()
    if (mil < 10) {
      mil = '00' + mil
    } else if (mil < 100) {
      mil = '0' + mil
    }
    return 'Ticket#' + y + m + day + h + min + sec + mil
  },

  async exec ({ $record }) {
    const caseNumber = this.getCaseNumber()

    $record.values.Number = caseNumber
    $record.values.Status = 'New'
    $record.values.PreviousStatus = 'New'
    return $record
  }
}
