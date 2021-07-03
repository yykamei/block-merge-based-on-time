import * as core from "@actions/core"
import { shouldBlock } from "../src/should-block"
import { Inputs } from "../src/inputs"

describe("shouldBlock", () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test.each`
    after      | before     | timezone                   | prohibited                                   | now                                                       | expected
    ${"17:20"} | ${"07:00"} | ${"America/New_York"}      | ${""}                                        | ${"2021-06-11T07:00:00-04:00"}                            | ${true}
    ${"17:20"} | ${"07:00"} | ${"America/New_York"}      | ${""}                                        | ${"2021-06-11T17:20:00-04:00"}                            | ${true}
    ${"17:20"} | ${"07:00"} | ${"America/New_York"}      | ${""}                                        | ${"2021-06-11T07:00:01-04:00"}                            | ${false}
    ${"17:20"} | ${"07:00"} | ${"America/New_York"}      | ${""}                                        | ${"2021-06-11T17:19:59-04:00"}                            | ${false}
    ${"07:00"} | ${"09:00"} | ${"America/New_York"}      | ${""}                                        | ${"2021-06-11T07:00:00-04:00"}                            | ${true}
    ${"07:00"} | ${"09:00"} | ${"America/New_York"}      | ${""}                                        | ${"2021-06-11T09:00:00-04:00"}                            | ${true}
    ${"07:00"} | ${"09:00"} | ${"America/New_York"}      | ${""}                                        | ${"2021-06-11T06:59:59-04:00"}                            | ${false}
    ${"07:00"} | ${"09:00"} | ${"America/New_York"}      | ${""}                                        | ${"2021-06-11T09:00:01-04:00"}                            | ${false}
    ${"12:00"} | ${"16:00"} | ${"Asia/Tokyo"}            | ${""}                                        | ${"2021-06-11T09:00:00+09:00"}                            | ${false}
    ${"12:00"} | ${"16:00"} | ${"Asia/Tokyo"}            | ${""}                                        | ${"2021-06-11T16:00:01+09:00"}                            | ${false}
    ${"12:00"} | ${"16:00"} | ${"Asia/Tokyo"}            | ${""}                                        | ${"2021-06-11T12:00:00+09:00"}                            | ${true}
    ${"12:00"} | ${"16:00"} | ${"Asia/Tokyo"}            | ${""}                                        | ${"2021-06-11T13:10:00+09:00"}                            | ${true}
    ${"12:00"} | ${"16:00"} | ${"Asia/Tokyo"}            | ${""}                                        | ${"2021-06-11T15:59:59+09:00"}                            | ${true}
    ${"12:00"} | ${"16:00"} | ${"Asia/Tokyo"}            | ${""}                                        | ${"2021-06-11T00:00:00+09:00"}                            | ${false}
    ${"12:00"} | ${"16:00"} | ${"Asia/Tokyo"}            | ${""}                                        | ${"2021-06-11T23:59:59+09:00"}                            | ${false}
    ${"23:00"} | ${"03:00"} | ${"Australia/Broken_Hill"} | ${""}                                        | ${"2021-06-11T23:00:00+09:30"}                            | ${true}
    ${"23:00"} | ${"03:00"} | ${"Australia/Broken_Hill"} | ${""}                                        | ${"2021-06-11T03:00:00+09:30"}                            | ${true}
    ${"23:00"} | ${"03:00"} | ${"Australia/Broken_Hill"} | ${""}                                        | ${"2021-06-11T00:10:00+09:30"}                            | ${true}
    ${"23:00"} | ${"03:00"} | ${"Australia/Broken_Hill"} | ${""}                                        | ${"2021-06-11T02:30:00+09:30"}                            | ${true}
    ${"23:00"} | ${"03:00"} | ${"Australia/Broken_Hill"} | ${""}                                        | ${"2021-06-11T03:30:00+09:30"}                            | ${false}
    ${"23:00"} | ${"03:00"} | ${"Australia/Broken_Hill"} | ${"Sunday, "}                                | ${"2021-06-12T16:30:00+09:30"}                            | ${false}
    ${"23:00"} | ${"03:00"} | ${"Australia/Broken_Hill"} | ${"Sunday, Saturday"}                        | ${"2021-06-12T16:30:00+09:30"}                            | ${true}
    ${"23:00"} | ${"03:00"} | ${"Australia/Broken_Hill"} | ${"Sunday, Saturday"}                        | ${"2021-06-13T16:30:00+09:30"}                            | ${true}
    ${"23:00"} | ${"03:00"} | ${"Australia/Broken_Hill"} | ${"Sunday, Saturday"}                        | ${"2021-06-14T16:30:00+09:30"}                            | ${false}
    ${"23:00"} | ${"03:00"} | ${"Australia/Broken_Hill"} | ${"Sunday, Saturday, 2021-06-14"}            | ${"2021-06-14T16:30:00+09:30"}                            | ${true}
    ${"23:00"} | ${"03:00"} | ${"Australia/Broken_Hill"} | ${"Sunday, Saturday, 2021-06-14"}            | ${"2021-06-15T16:30:00+09:30"}                            | ${false}
    ${"09:00"} | ${"12:00"} | ${"Australia/Broken_Hill"} | ${"Sunday, Saturday, 2021-08-10/2021-08-16"} | ${"2021-08-09T23:59:59+09:30"}                            | ${false}
    ${"09:00"} | ${"12:00"} | ${"Australia/Broken_Hill"} | ${"Sunday, Saturday, 2021-08-10/2021-08-16"} | ${"2021-08-10T00:00:00+09:30"}                            | ${true}
    ${"09:00"} | ${"12:00"} | ${"Australia/Broken_Hill"} | ${"Sunday, Saturday, 2021-08-10/2021-08-16"} | ${"2021-08-16T23:59:59+09:30"}                            | ${true}
    ${"09:00"} | ${"12:00"} | ${"Australia/Broken_Hill"} | ${"Sunday, Saturday, 2021-08-10/2021-08-16"} | ${"2021-08-17T00:00:00+09:30"}                            | ${false}
    ${"09:00"} | ${"12:00"} | ${"Australia/Broken_Hill"} | ${"Sunday, Saturday, 2021-08-10/2021-08-16"} | ${"2021-08-17T08:59:59+09:30"}                            | ${false}
    ${"09:00"} | ${"12:00"} | ${"Australia/Broken_Hill"} | ${"Sunday, Saturday, 2021-08-10/2021-08-16"} | ${"2021-08-17T09:00:00+09:30"}                            | ${true}
    ${"09:00"} | ${"12:00"} | ${"Australia/Broken_Hill"} | ${"Sunday, Saturday, 2021-08-10/2021-08-16"} | ${"2021-08-17T12:00:00+09:30"}                            | ${true}
    ${"09:00"} | ${"12:00"} | ${"Australia/Broken_Hill"} | ${"Sunday, Saturday, 2021-08-10/2021-08-16"} | ${"2021-08-17T12:00:01+09:30"}                            | ${false}
    ${"09:00"} | ${"12:00"} | ${"Australia/Broken_Hill"} | ${"2021-12-29/2022-01-05"}                   | ${"2021-12-28T23:59:59+10:30" /* Daylight saving time */} | ${false}
    ${"09:00"} | ${"12:00"} | ${"Australia/Broken_Hill"} | ${"2021-12-29/2022-01-05"}                   | ${"2021-12-29T00:00:00+10:30" /* Daylight saving time */} | ${true}
    ${"09:00"} | ${"12:00"} | ${"Australia/Broken_Hill"} | ${"2021-12-29/2022-01-05"}                   | ${"2021-12-31T23:30:00+10:30" /* Daylight saving time */} | ${true}
    ${"09:00"} | ${"12:00"} | ${"Australia/Broken_Hill"} | ${"2021-12-29/2022-01-05"}                   | ${"2022-01-05T23:59:59+10:30" /* Daylight saving time */} | ${true}
    ${"09:00"} | ${"12:00"} | ${"Australia/Broken_Hill"} | ${"2021-12-29/2022-01-05"}                   | ${"2022-01-06T00:00:00+10:30" /* Daylight saving time */} | ${false}
  `(
    "returns $expected with: now=$now, after=$after, before=$before, timezone=$timezone, prohibited=$prohibited",
    ({ now, after, before, timezone, prohibited, expected }) => {
      jest.setSystemTime(new Date(now))
      const inSpy = jest.spyOn(core, "getInput")
      inSpy.mockImplementation(
        (name) => ({ after, before, timezone, "prohibited-days-dates": prohibited }[name] as any)
      )

      const inputs = new Inputs()
      expect(shouldBlock(inputs)).toEqual(expected)
    }
  )
})
