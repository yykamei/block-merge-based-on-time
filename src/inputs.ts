import { getInput } from "@actions/core"
import type { Zone } from "luxon"
import { DateTime, Interval } from "luxon"
import type { Dates, Days, DaysDates } from "./types"

export class Inputs {
  public readonly token: string
  public readonly after: DateTime
  public readonly before: DateTime
  public readonly timezone: Zone
  public readonly prohibitedDays: Days
  public readonly prohibitedDates: Dates
  public readonly noBlockLabel: string
  public readonly commitStatusContext: string
  public readonly commitStatusDescriptionWithSuccess: string
  public readonly commitStatusDescriptionWhileBlocking: string
  public readonly commitStatusURL: string | null

  constructor() {
    // TODO: Some parameters' defaults are duplicated with `action.yml`. We can refactor for DRY.
    this.token = getInput("token", { required: true })
    this.timezone = timeZone()
    this.after = dateTime("hh:mm", getInput("after"), this.timezone)
    this.before = dateTime("hh:mm", getInput("before"), this.timezone)
    const [days, dates] = prohibitedDaysDates(this.timezone)
    this.prohibitedDays = days
    this.prohibitedDates = dates
    this.noBlockLabel = stringOr(getInput("no-block-label"), "no-block")
    this.commitStatusContext = stringOr(getInput("commit-status-context"), "block-merge-based-on-time")
    this.commitStatusDescriptionWithSuccess = stringOr(
      getInput("commit-status-description-with-success"),
      "The PR could be merged"
    )
    this.commitStatusDescriptionWhileBlocking = stringOr(
      getInput("commit-status-description-while-blocking"),
      "The PR can't be merged based on time, which is due to your organization's policy"
    )
    this.commitStatusURL = getInput("commit-status-url") || null // NOTE: If the string is empty, we're not sure where we should refe tor
  }
}

function timeZone(): Zone {
  const d = DateTime.now().setZone(getInput("timezone"))
  if (d.invalidExplanation != null) {
    throw new Error(d.invalidExplanation)
  }
  return d.zone
}

function dateTime(format: string, s: string, zone: Zone): DateTime {
  const d = DateTime.fromFormat(s, format, { zone, setZone: true })
  if (d.invalidExplanation != null) {
    throw new Error(d.invalidExplanation)
  }
  return d
}

function interval(s: string, zone: Zone): Interval {
  let ret: Interval
  if (s.split("/", 2).length === 2) {
    ret = Interval.fromISO(s, { zone })
    if (ret.end != null) {
      ret = ret.set({ end: ret.end.endOf("day") })
    }
  } else {
    const start = dateTime("yyyy-MM-dd", s, zone)
    ret = Interval.fromDateTimes(start, start.endOf("day"))
  }
  if (ret.invalidExplanation != null) {
    throw new Error(ret.invalidExplanation)
  }
  return ret
}

function prohibitedDaysDates(zone: Zone): DaysDates {
  const days: Days = []
  const dates: Dates = []
  getInput("prohibited-days-dates")
    .split(/,\s*/)
    .forEach((s) => {
      switch (s) {
        case "Sunday":
        case "Monday":
        case "Tuesday":
        case "Wednesday":
        case "Thursday":
        case "Friday":
        case "Saturday": {
          days.push(s)
          break
        }
        case "":
          break // If the input is empty string, split array will have one empty string in it.
        default: {
          dates.push(interval(s, zone))
          break
        }
      }
    })
  return [days, dates]
}

/**
 *
 * Return the passed string as is but an alternative when the passed string is empty.
 *
 * @param str
 */
function stringOr(str: string, alt: string): string {
  return str || alt
}
