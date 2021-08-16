import * as core from "@actions/core"
import { DateTime } from "luxon"
import type { Inputs } from "./inputs"
import type { Dates, Days, Hours } from "./types"

export function shouldBlock(inputs: Inputs): boolean {
  core.debug(`Start shouldBlock()`)
  const now = DateTime.now().setZone(inputs.timezone)
  if (isProhibitedDay(now, inputs.prohibitedDays, inputs.prohibitedDates)) {
    core.debug(`shouldBlock() decided to return "true" because ${now} is within prohibited days`)
    return true
  } else if (isDuringTime(now, inputs.after, inputs.before)) {
    core.debug(`shouldBlock() decided to return "true" because ${now} is during prohibited hours`)
    return true
  }
  core.debug(`shouldBlock() decided to return "false"`)
  return false
}

function isProhibitedDay(now: DateTime, days: Days, dates: Dates) {
  if (days.includes(now.weekdayLong)) {
    return true
  } else if (dates.some((d) => d.contains(now))) {
    return true
  }
  return false
}

function isDuringTime(now: DateTime, after: Hours, before: Hours): boolean {
  const a = hour(now, after)
  const b = hour(now, before)
  if (a.diff(b).toMillis() > 0) {
    return now.diff(a).toMillis() >= 0 || now.diff(b).toMillis() <= 0
  } else {
    return now.diff(a).toMillis() >= 0 && now.diff(b).toMillis() <= 0
  }
}

function hour(now: DateTime, hours: Hours): DateTime {
  switch (now.weekdayLong) {
    case "Sunday":
      return hours.Sunday ?? hours.base
    case "Monday":
      return hours.Monday ?? hours.base
    case "Tuesday":
      return hours.Tuesday ?? hours.base
    case "Wednesday":
      return hours.Wednesday ?? hours.base
    case "Thursday":
      return hours.Thursday ?? hours.base
    case "Friday":
      return hours.Friday ?? hours.base
    case "Saturday":
      return hours.Saturday ?? hours.base
    default:
      throw new Error(`Unsupported weekday: "${now.weekdayLong}"`)
  }
}
