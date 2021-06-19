import { getInput } from "@actions/core"
import type { Zone } from "luxon"
import { DateTime } from "luxon"
import type { Dates, Days, DaysDates } from "./types"

export class Inputs {
  public readonly token: string
  public readonly after: DateTime
  public readonly before: DateTime
  public readonly timezone: Zone
  public readonly prohibitedDays: Days
  public readonly prohibitedDates: Dates
  public readonly noBlockLabel: string | null
  public readonly commitStatusContext: string | null
  public readonly commitStatusDescriptionWithSuccess: string | null
  public readonly commitStatusDescriptionWhileBlocking: string | null
  public readonly commitStatusURL: string | null

  constructor() {
    this.token = getInput("token", { required: true })
    this.timezone = timeZone()
    this.after = dateTime(getInput("after"), this.timezone)
    this.before = dateTime(getInput("before"), this.timezone)
    const [days, dates] = prohibitedDaysDates(this.timezone)
    this.prohibitedDays = days
    this.prohibitedDates = dates
    this.noBlockLabel = stringOrNull(getInput("no-block-label"))
    this.commitStatusContext = stringOrNull(getInput("commit-status-context"))
    this.commitStatusDescriptionWithSuccess = stringOrNull(getInput("commit-status-description-with-success"))
    this.commitStatusDescriptionWhileBlocking = stringOrNull(getInput("commit-status-description-while-blocking"))
    this.commitStatusURL = stringOrNull(getInput("commit-status-url"))
  }
}

function timeZone(): Zone {
  const d = DateTime.now().setZone(getInput("timezone"))
  if (d.invalidExplanation != null) {
    throw new Error(d.invalidExplanation)
  }
  return d.zone
}

function dateTime(s: string, zone: Zone): DateTime {
  const d = DateTime.fromFormat(s, "hh:mm", { zone, setZone: true })
  if (d.invalidExplanation != null) {
    throw new Error(d.invalidExplanation)
  }
  return d
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
          const d = DateTime.fromFormat(s, "yyyy-MM-dd", { zone, setZone: true })
          if (d.invalidExplanation) {
            throw new Error(d.invalidExplanation)
          }
          dates.push(d)
          break
        }
      }
    })
  return [days, dates]
}

/**
 *
 * Return the passed string as is, with the exception of empty string.
 *
 * @param str
 */
function stringOrNull(str: string): string | null {
  return str || null
}
