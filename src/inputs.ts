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
  public readonly noBlockLabel: string

  constructor() {
    this.token = getInput("token", { required: true })
    this.timezone = timeZone()
    this.after = dateTime(getInput("after"), this.timezone)
    this.before = dateTime(getInput("before"), this.timezone)
    const [days, dates] = prohibitedDaysDates(this.timezone)
    this.prohibitedDays = days
    this.prohibitedDates = dates
    this.noBlockLabel = getInput("no-block-label")
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
