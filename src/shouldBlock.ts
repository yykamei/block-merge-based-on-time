import { DateTime } from "luxon"
import type { Inputs } from "./inputs"
import type { Dates, Days } from "./types"

export function shouldBlock(inputs: Inputs): boolean {
  const now = DateTime.now().setZone(inputs.timezone)
  if (isProhibitedDay(now, inputs.prohibitedDays, inputs.prohibitedDates)) {
    return true
  } else if (isDuringTime(now, inputs.after, inputs.before)) {
    return true
  }
  return false
}

function isProhibitedDay(now: DateTime, days: Days, dates: Dates) {
  if (days.includes(now.weekdayLong)) {
    return true
  } else if (dates.some((d) => d.hasSame(now, "day"))) {
    return true
  }
  return false
}

function isDuringTime(now: DateTime, after: DateTime, before: DateTime): boolean {
  if (after.diff(before).toMillis() > 0) {
    return now.diff(after).toMillis() >= 0 || now.diff(before).toMillis() <= 0
  } else {
    return now.diff(after).toMillis() >= 0 && now.diff(before).toMillis() <= 0
  }
}
