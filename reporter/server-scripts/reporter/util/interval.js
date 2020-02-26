const intervalDaily = 'daily'
const intervalWeekly = 'weekly'
const intervalMonthly = 'monthly'
const intervalToday = 'today'

export function determineNextInterval (interval, last) {
  let next
  if (last) {
    next = new Date(last)
  } else {
    next = new Date()
  }

  dt.setHours(0)
  dt.setMinutes(0)
  dt.setSeconds(0)
  dt.setMilliseconds(0)

  switch (interval) {
    case intervalDaily:
      next.setDate(next.getDate() + 1)
      break

    case intervalWeekly:
      // go 1 over, so it is for the last week
      next.setDate((last.getDate() - last.getDay()) + 7)
      break

    case intervalMonthly:
      next.setMonth(next.getMonth() + 1)
      next.setDate(1)
      break

    case intervalToday:
      break

    default:
      throw new Error('interval.notSupported')
  }

  return next
}
