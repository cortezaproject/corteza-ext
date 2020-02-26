import { determineNextInterval } from './util/interval'

export default {
  label: 'Subscriber',
  description: 'Manages user\'s subscriptions',

  /* istanbul ignore next */
  triggers ({ before }) {
    return before('create', 'update')
      .for('compose:record')
      .where('module', ['ext_reporter_subscription'])
  },

  async exec ({ $record, $authUser }, { $System }) {
    if (!$record.values.LastReportAt) {
      $record.values.LastReportAt = determineNextInterval('today')
    }

    // determine next scheduled report
    $record.values.NextReportAt = determineNextInterval($record.values.Period, $record.values.LastReportAt)

    // default user
    if (!$record.values.User) {
      $record.values.User = $authUser.userID
    }

    if (!$record.values.SendTo) {
      const u = await $System.findUserByID($record.values.User)
      $record.values.SendTo = u.userID
    }

    return $record
  }
}
