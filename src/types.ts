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
