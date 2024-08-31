import { getInput } from "@actions/core"
import type { Zone } from "luxon"
import { DateTime, Interval } from "luxon"
import holidays from "./holidays.json"
import type { Dates, Days, DaysDates, HolidayEntry, Hours } from "./types"

export class Inputs {
  public readonly token: string
  public readonly after: Hours
  public readonly before: Hours
  public readonly timezone: Zone
  public readonly prohibitedDays: Days
  public readonly prohibitedDates: Dates
  public readonly noBlockLabel: string[]
  public readonly commitStatusContext: string
  public readonly commitStatusDescriptionWithSuccess: string
  public readonly commitStatusDescriptionWhileBlocking: string
  public readonly commitStatusURL: string | null
  private readonly rawBaseBranches: string[]

  constructor() {
    this.token = getInput("token", { required: true })
    this.timezone = timeZone()
    this.after = hours("after", this.timezone)
    this.before = hours("before", this.timezone)
    const [days, dates] = prohibitedDaysDates(this.timezone)
    this.prohibitedDays = days
    this.prohibitedDates = dates
    this.noBlockLabel = stringOr(getInput("no-block-label"), "no-block")
      .split(/,\s*/)
      .filter((v) => v !== "")
    this.commitStatusContext = stringOr(getInput("commit-status-context"), "block-merge-based-on-time")
    this.commitStatusDescriptionWithSuccess = stringOr(
      getInput("commit-status-description-with-success"),
      "The PR could be merged",
    )
    this.commitStatusDescriptionWhileBlocking = stringOr(
      getInput("commit-status-description-while-blocking"),
      "The PR can't be merged based on time, which is due to your organization's policy",
    )
    // NOTE: If the string is empty, we're not sure where we should refer to. So, `||` is appropriate here instead of `??`.
    this.commitStatusURL = getInput("commit-status-url") || null
    this.rawBaseBranches = getInput("base-branches")
      .split(/,\s*/)
      .filter((v) => v !== "")
  }

  public baseBranches(defaultBranch: string): RegExp[] {
    return this.rawBaseBranches.map((v) => {
      if (v === "(default)") {
        return new RegExp(`^${escapeRegExpCharacters(defaultBranch)}$`)
      } else if (v.startsWith("/") && v.endsWith("/")) {
        return new RegExp(v.replace(/^\/(.*)\/$/, "$1"))
      }
      return new RegExp(`^${escapeRegExpCharacters(v)}$`)
    })
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

function hours(key: "after" | "before", zone: Zone): Hours {
  const input = getInput(key)
  const baseRegExp = /^\d\d:\d\d$/
  const daysRegExp = /^(?<hour>\d\d:\d\d) on (?<day>Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)$/
  const result: Hours = input.split(/,\s*/).reduce(
    (result, str) => {
      if (baseRegExp.test(str)) {
        return { ...result, base: dateTime("hh:mm", str, zone) }
      } else {
        const match = str.match(daysRegExp)
        if (match != null && match.groups != null && match.groups["day"] != null && match.groups["hour"] != null) {
          const day = match.groups["day"]
          const hour = match.groups["hour"]
          return { ...result, [day]: dateTime("hh:mm", hour, zone) }
        } else {
          throw new Error(`Invalid "${key}" was given. The example format is "16:30 on Monday"`)
        }
      }
    },
    { base: dateTime("hh:mm", "00:00", zone) },
  )
  return result
}

function holidayEntries(region: string): HolidayEntry[] {
  const validRegion = (r: string): r is keyof typeof holidays => r in holidays
  if (validRegion(region)) {
    return holidays[region]
  }
  throw new Error(`Unsupported region is given: "${region}"`)
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
          if (s.startsWith("H:")) {
            const [_prefix, region] = s.split("H:", 2)
            if (region != null) {
              holidayEntries(region).forEach((entry) => {
                dates.push(interval(entry.date, zone))
              })
            }
          } else if (s.startsWith("BH:")) {
            const [_prefix, region] = s.split("BH:", 2)
            if (region != null) {
              holidayEntries(region).forEach((entry) => {
                let d = DateTime.fromISO(entry.date)
                d = d.set({ day: d.day - 1 })
                // NOTE: `toISODate()` should return string, but the following PR introduced `| IfInvalid<null>`
                //       for the function, and we cannot succeed type-checking without `!`.
                //
                //       https://github.com/DefinitelyTyped/DefinitelyTyped/pull/64995
                //
                dates.push(interval(d.toISODate()!, zone))
              })
            }
          } else {
            dates.push(interval(s, zone))
          }
          break
        }
      }
    })
  return [days, dates]
}

/**
 *
 * return the passed string as is but an alternative when the passed string is empty.
 *
 * @param {string} str
 * @param {string} alt
 */
function stringOr(str: string, alt: string): string {
  return str || alt
}

// NOTE: I followed this guide.
//       https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
function escapeRegExpCharacters(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
