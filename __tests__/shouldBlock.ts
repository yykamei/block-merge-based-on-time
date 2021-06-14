import * as core from "@actions/core"
import { shouldBlock } from "../src/shouldBlock"
import { Inputs } from "../src/inputs"

describe("shouldBlock", () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test.each`
    after      | before     | timezone                   | prohibited                        | now                            | expected
    ${"17:20"} | ${"07:00"} | ${"America/New_York"}      | ${""}                             | ${"2021-06-11T07:00:00-04:00"} | ${true}
    ${"17:20"} | ${"07:00"} | ${"America/New_York"}      | ${""}                             | ${"2021-06-11T17:20:00-04:00"} | ${true}
    ${"17:20"} | ${"07:00"} | ${"America/New_York"}      | ${""}                             | ${"2021-06-11T07:00:01-04:00"} | ${false}
    ${"17:20"} | ${"07:00"} | ${"America/New_York"}      | ${""}                             | ${"2021-06-11T17:19:59-04:00"} | ${false}
    ${"07:00"} | ${"09:00"} | ${"America/New_York"}      | ${""}                             | ${"2021-06-11T07:00:00-04:00"} | ${true}
    ${"07:00"} | ${"09:00"} | ${"America/New_York"}      | ${""}                             | ${"2021-06-11T09:00:00-04:00"} | ${true}
    ${"07:00"} | ${"09:00"} | ${"America/New_York"}      | ${""}                             | ${"2021-06-11T06:59:59-04:00"} | ${false}
    ${"07:00"} | ${"09:00"} | ${"America/New_York"}      | ${""}                             | ${"2021-06-11T09:00:01-04:00"} | ${false}
    ${"12:00"} | ${"16:00"} | ${"Asia/Tokyo"}            | ${""}                             | ${"2021-06-11T09:00:00+09:00"} | ${false}
    ${"12:00"} | ${"16:00"} | ${"Asia/Tokyo"}            | ${""}                             | ${"2021-06-11T16:00:01+09:00"} | ${false}
    ${"12:00"} | ${"16:00"} | ${"Asia/Tokyo"}            | ${""}                             | ${"2021-06-11T12:00:00+09:00"} | ${true}
    ${"12:00"} | ${"16:00"} | ${"Asia/Tokyo"}            | ${""}                             | ${"2021-06-11T13:10:00+09:00"} | ${true}
    ${"12:00"} | ${"16:00"} | ${"Asia/Tokyo"}            | ${""}                             | ${"2021-06-11T15:59:59+09:00"} | ${true}
    ${"12:00"} | ${"16:00"} | ${"Asia/Tokyo"}            | ${""}                             | ${"2021-06-11T00:00:00+09:00"} | ${false}
    ${"12:00"} | ${"16:00"} | ${"Asia/Tokyo"}            | ${""}                             | ${"2021-06-11T23:59:59+09:00"} | ${false}
    ${"23:00"} | ${"03:00"} | ${"Australia/Broken_Hill"} | ${""}                             | ${"2021-06-11T23:00:00+09:30"} | ${true}
    ${"23:00"} | ${"03:00"} | ${"Australia/Broken_Hill"} | ${""}                             | ${"2021-06-11T03:00:00+09:30"} | ${true}
    ${"23:00"} | ${"03:00"} | ${"Australia/Broken_Hill"} | ${""}                             | ${"2021-06-11T00:10:00+09:30"} | ${true}
    ${"23:00"} | ${"03:00"} | ${"Australia/Broken_Hill"} | ${""}                             | ${"2021-06-11T02:30:00+09:30"} | ${true}
    ${"23:00"} | ${"03:00"} | ${"Australia/Broken_Hill"} | ${""}                             | ${"2021-06-11T03:30:00+09:30"} | ${false}
    ${"23:00"} | ${"03:00"} | ${"Australia/Broken_Hill"} | ${"Sunday, "}                     | ${"2021-06-12T16:30:00+09:30"} | ${false}
    ${"23:00"} | ${"03:00"} | ${"Australia/Broken_Hill"} | ${"Sunday, Saturday"}             | ${"2021-06-12T16:30:00+09:30"} | ${true}
    ${"23:00"} | ${"03:00"} | ${"Australia/Broken_Hill"} | ${"Sunday, Saturday"}             | ${"2021-06-13T16:30:00+09:30"} | ${true}
    ${"23:00"} | ${"03:00"} | ${"Australia/Broken_Hill"} | ${"Sunday, Saturday"}             | ${"2021-06-14T16:30:00+09:30"} | ${false}
    ${"23:00"} | ${"03:00"} | ${"Australia/Broken_Hill"} | ${"Sunday, Saturday, 2021-06-14"} | ${"2021-06-14T16:30:00+09:30"} | ${true}
    ${"23:00"} | ${"03:00"} | ${"Australia/Broken_Hill"} | ${"Sunday, Saturday, 2021-06-14"} | ${"2021-06-15T16:30:00+09:30"} | ${false}
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
