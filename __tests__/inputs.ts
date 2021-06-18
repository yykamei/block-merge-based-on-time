import * as core from "@actions/core"
import { Inputs } from "../src/inputs"
import { DateTime, IANAZone } from "luxon"

describe("Inputs", () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date("2021-06-17T16:30:00-10:00"))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  test("returns a valid instance", () => {
    const inSpy = jest.spyOn(core, "getInput")
    inSpy.mockImplementation(
      (name) =>
        ({
          token: "abc",
          after: "12:20",
          before: "16:00",
          timezone: "Pacific/Honolulu",
          "prohibited-days-dates": "Sunday, 2021-07-01",
          "no-block-label": "Emergency",
        }[name] as any)
    )
    const inputs = new Inputs()
    expect(inputs).toHaveProperty("token", "abc")
    expect(inputs).toHaveProperty("after", DateTime.fromObject({ hour: 12, minute: 20, zone: "Pacific/Honolulu" }))
    expect(inputs).toHaveProperty("before", DateTime.fromObject({ hour: 16, minute: 0, zone: "Pacific/Honolulu" }))
    expect(inputs).toHaveProperty("timezone", IANAZone.create("Pacific/Honolulu"))
    expect(inputs).toHaveProperty("prohibitedDays", ["Sunday"])
    expect(inputs).toHaveProperty("prohibitedDates", [
      DateTime.fromObject({
        month: 7,
        day: 1,
        zone: "Pacific/Honolulu",
      }),
    ])
    expect(inputs).toHaveProperty("noBlockLabel", "Emergency")
  })

  test("returns an error with invalid zone", () => {
    const inSpy = jest.spyOn(core, "getInput")
    inSpy.mockImplementation((name) => ({ token: "abc", timezone: "Unknown/Abc" }[name] as any))
    expect(() => new Inputs()).toThrow(new Error('the zone "Unknown/Abc" is not supported'))
  })

  test("returns an error with invalid after", () => {
    const inSpy = jest.spyOn(core, "getInput")
    inSpy.mockImplementation((name) => ({ token: "abc", timezone: "UTC+3", after: "1220" }[name] as any))
    expect(() => new Inputs()).toThrow(new Error('the input "1220" can\'t be parsed as format hh:mm'))
  })

  test("returns an error with invalid before", () => {
    const inSpy = jest.spyOn(core, "getInput")
    inSpy.mockImplementation(
      (name) =>
        ({
          token: "abc",
          timezone: "UTC+3",
          after: "21:00",
          before: "invalid",
        }[name] as any)
    )
    expect(() => new Inputs()).toThrow(new Error('the input "invalid" can\'t be parsed as format hh:mm'))
  })

  test("returns an error with invalid day", () => {
    const inSpy = jest.spyOn(core, "getInput")
    inSpy.mockImplementation(
      (name) =>
        ({
          token: "abc",
          timezone: "UTC+3",
          after: "21:00",
          before: "01:20",
          "prohibited-days-dates": "Superday",
        }[name] as any)
    )
    expect(() => new Inputs()).toThrow(new Error('the input "Superday" can\'t be parsed as format yyyy-MM-dd'))
  })

  test("returns an error with invalid date", () => {
    const inSpy = jest.spyOn(core, "getInput")
    inSpy.mockImplementation(
      (name) =>
        ({
          token: "abc",
          timezone: "UTC+3",
          after: "21:00",
          before: "01:20",
          "prohibited-days-dates": "20:13",
        }[name] as any)
    )
    expect(() => new Inputs()).toThrow(new Error('the input "20:13" can\'t be parsed as format yyyy-MM-dd'))
  })
})
