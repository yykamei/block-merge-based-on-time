import type { DateTime, Interval } from "luxon"

export type Days = string[]
export type Dates = Interval[]
export type DaysDates = [Days, Dates]

export interface Hours {
  readonly base: DateTime
  readonly Sunday?: DateTime
  readonly Monday?: DateTime
  readonly Tuesday?: DateTime
  readonly Wednesday?: DateTime
  readonly Thursday?: DateTime
  readonly Friday?: DateTime
  readonly Saturday?: DateTime
}

export interface Holidays {
  [key: string]: ReadonlyArray<HolidayEntry>
}

export interface HolidayEntry {
  readonly id: string
  readonly status: string
  readonly summary: string
  readonly region: string
  readonly date: string
}

export interface PullRequestStatus {
  readonly owner: string
  readonly repo: string
  readonly number: number
  readonly baseBranch: string
  readonly sha: string
  readonly labels: string[]
  readonly state?: string
}
