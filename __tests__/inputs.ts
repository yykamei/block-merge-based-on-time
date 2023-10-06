import * as core from "@actions/core"
import { Inputs } from "../src/inputs"
import { DateTime, IANAZone, Interval } from "luxon"

describe("Inputs", () => {
  beforeAll(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date("2023-06-17T16:30:00-10:00"))
    jest.spyOn(core, "debug").mockImplementation(jest.fn)
  })

  afterAll(() => {
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
          "prohibited-days-dates": "Sunday, 2023-07-01",
          "no-block-label": "Emergency",
          "commit-status-context": "Blocker",
          "commit-status-description-with-success": "OK",
          "commit-status-description-while-blocking": "Blocked!",
          "commit-status-url": "https://example.com",
          "base-branches": "/^.*$/",
        })[name] as any,
    )
    const inputs = new Inputs()
    expect(inputs).toHaveProperty("token", "abc")
    expect(inputs).toHaveProperty("after", {
      base: DateTime.fromObject(
        {
          hour: 12,
          minute: 20,
        },
        {
          zone: "Pacific/Honolulu",
        },
      ),
    })
    expect(inputs).toHaveProperty("before", {
      base: DateTime.fromObject(
        {
          hour: 16,
          minute: 0,
        },
        {
          zone: "Pacific/Honolulu",
        },
      ),
    })
    expect(inputs).toHaveProperty("timezone", IANAZone.create("Pacific/Honolulu"))
    expect(inputs).toHaveProperty("prohibitedDays", ["Sunday"])
    expect(inputs).toHaveProperty("prohibitedDates", [
      Interval.fromDateTimes(
        DateTime.fromObject(
          {
            year: 2023,
            month: 7,
            day: 1,
          },
          {
            zone: "Pacific/Honolulu",
          },
        ),
        DateTime.fromObject(
          {
            year: 2023,
            month: 7,
            day: 1,
          },
          {
            zone: "Pacific/Honolulu",
          },
        ).endOf("day"),
      ),
    ])
    expect(inputs).toHaveProperty("noBlockLabel", "Emergency")
    expect(inputs).toHaveProperty("commitStatusContext", "Blocker")
    expect(inputs).toHaveProperty("commitStatusDescriptionWithSuccess", "OK")
    expect(inputs).toHaveProperty("commitStatusDescriptionWhileBlocking", "Blocked!")
    expect(inputs).toHaveProperty("commitStatusURL", "https://example.com")
    expect(inputs).toHaveProperty("rawBaseBranches", ["/^.*$/"])
  })

  test("returns a valid instance when empty strings were explicitly passed", () => {
    const inSpy = jest.spyOn(core, "getInput")
    inSpy.mockImplementation(
      (name) =>
        ({
          token: "abc",
          after: "12:20",
          before: "16:00",
          timezone: "Pacific/Honolulu",
          "prohibited-days-dates": "",
          "no-block-label": "",
          "commit-status-context": "",
          "commit-status-description-with-success": "",
          "commit-status-description-while-blocking": "",
          "commit-status-url": "",
          "base-branches": "",
        })[name] as any,
    )
    const inputs = new Inputs()
    expect(inputs).toHaveProperty("token", "abc")
    expect(inputs).toHaveProperty("after", {
      base: DateTime.fromObject(
        {
          hour: 12,
          minute: 20,
        },
        {
          zone: "Pacific/Honolulu",
        },
      ),
    })
    expect(inputs).toHaveProperty("before", {
      base: DateTime.fromObject(
        {
          hour: 16,
          minute: 0,
        },
        {
          zone: "Pacific/Honolulu",
        },
      ),
    })
    expect(inputs).toHaveProperty("timezone", IANAZone.create("Pacific/Honolulu"))
    expect(inputs).toHaveProperty("prohibitedDays", [])
    expect(inputs).toHaveProperty("prohibitedDates", [])
    expect(inputs).toHaveProperty("noBlockLabel", "no-block")
    expect(inputs).toHaveProperty("commitStatusContext", "block-merge-based-on-time")
    expect(inputs).toHaveProperty("commitStatusDescriptionWithSuccess", "The PR could be merged")
    expect(inputs).toHaveProperty(
      "commitStatusDescriptionWhileBlocking",
      "The PR can't be merged based on time, which is due to your organization's policy",
    )
    expect(inputs).toHaveProperty("commitStatusURL", null)
    expect(inputs).toHaveProperty("rawBaseBranches", [])
  })

  test("returns a valid instance with the ranged dates for prohibited-days-dates", () => {
    const inSpy = jest.spyOn(core, "getInput")
    inSpy.mockImplementation(
      (name) =>
        ({
          token: "abc",
          after: "12:20",
          before: "16:00",
          timezone: "Pacific/Honolulu",
          "prohibited-days-dates": "Sunday, 2023-07-30, 2023-08-06/2023-08-10",
          "base-branches": "(default)",
        })[name] as any,
    )
    const inputs = new Inputs()
    expect(inputs).toHaveProperty("token", "abc")
    expect(inputs).toHaveProperty("after", {
      base: DateTime.fromObject(
        {
          hour: 12,
          minute: 20,
        },
        {
          zone: "Pacific/Honolulu",
        },
      ),
    })
    expect(inputs).toHaveProperty("before", {
      base: DateTime.fromObject(
        {
          hour: 16,
          minute: 0,
        },
        {
          zone: "Pacific/Honolulu",
        },
      ),
    })
    expect(inputs).toHaveProperty("timezone", IANAZone.create("Pacific/Honolulu"))
    expect(inputs).toHaveProperty("prohibitedDays", ["Sunday"])
    expect(inputs).toHaveProperty("prohibitedDates", [
      Interval.fromDateTimes(
        DateTime.fromObject(
          {
            year: 2023,
            month: 7,
            day: 30,
          },
          {
            zone: "Pacific/Honolulu",
          },
        ),
        DateTime.fromObject(
          {
            year: 2023,
            month: 7,
            day: 30,
          },
          {
            zone: "Pacific/Honolulu",
          },
        ).endOf("day"),
      ),
      Interval.fromDateTimes(
        DateTime.fromObject(
          {
            year: 2023,
            month: 8,
            day: 6,
          },
          {
            zone: "Pacific/Honolulu",
          },
        ),
        DateTime.fromObject(
          {
            year: 2023,
            month: 8,
            day: 10,
          },
          {
            zone: "Pacific/Honolulu",
          },
        ).endOf("day"),
      ),
    ])
    expect(inputs).toHaveProperty("noBlockLabel", "no-block")
    expect(inputs).toHaveProperty("commitStatusContext", "block-merge-based-on-time")
    expect(inputs).toHaveProperty("commitStatusDescriptionWithSuccess", "The PR could be merged")
    expect(inputs).toHaveProperty(
      "commitStatusDescriptionWhileBlocking",
      "The PR can't be merged based on time, which is due to your organization's policy",
    )
    expect(inputs).toHaveProperty("commitStatusURL", null)
  })

  test("returns a valid instance with the exception after/before", () => {
    const inSpy = jest.spyOn(core, "getInput")
    inSpy.mockImplementation(
      (name) =>
        ({
          token: "abc",
          after: "17:30, 16:30 on Monday",
          before: "09:00",
          timezone: "Europe/Madrid",
          "prohibited-days-dates": "",
          "no-block-label": "",
          "commit-status-context": "",
          "commit-status-description-with-success": "",
          "commit-status-description-while-blocking": "",
          "commit-status-url": "",
          "base-branches": "main",
        })[name] as any,
    )
    const inputs = new Inputs()
    expect(inputs).toHaveProperty("token", "abc")
    expect(inputs).toHaveProperty("after", {
      base: DateTime.fromObject(
        {
          hour: 17,
          minute: 30,
        },
        {
          zone: "Europe/Madrid",
        },
      ),
      Monday: DateTime.fromObject(
        {
          hour: 16,
          minute: 30,
        },
        {
          zone: "Europe/Madrid",
        },
      ),
    })
    expect(inputs).toHaveProperty("before", {
      base: DateTime.fromObject(
        {
          hour: 9,
          minute: 0,
        },
        {
          zone: "Europe/Madrid",
        },
      ),
    })
    expect(inputs).toHaveProperty("timezone", IANAZone.create("Europe/Madrid"))
    expect(inputs).toHaveProperty("prohibitedDays", [])
    expect(inputs).toHaveProperty("prohibitedDates", [])
    expect(inputs).toHaveProperty("noBlockLabel", "no-block")
    expect(inputs).toHaveProperty("commitStatusContext", "block-merge-based-on-time")
    expect(inputs).toHaveProperty("commitStatusDescriptionWithSuccess", "The PR could be merged")
    expect(inputs).toHaveProperty(
      "commitStatusDescriptionWhileBlocking",
      "The PR can't be merged based on time, which is due to your organization's policy",
    )
    expect(inputs).toHaveProperty("commitStatusURL", null)
    expect(inputs).toHaveProperty("rawBaseBranches", ["main"])
  })

  test("returns a valid instance with the regional holidays", () => {
    const inSpy = jest.spyOn(core, "getInput")
    inSpy.mockImplementation(
      (name) =>
        ({
          token: "abc",
          after: "17:30",
          before: "09:00",
          timezone: "Europe/Madrid",
          "prohibited-days-dates": "H:Spain, BH:Spain",
          "no-block-label": "",
          "commit-status-context": "",
          "commit-status-description-with-success": "",
          "commit-status-description-while-blocking": "",
          "commit-status-url": "",
          "base-branches": "main",
        })[name] as any,
    )
    const inputs = new Inputs()
    expect(inputs).toHaveProperty("token", "abc")
    expect(inputs).toHaveProperty("after", {
      base: DateTime.fromObject(
        {
          hour: 17,
          minute: 30,
        },
        {
          zone: "Europe/Madrid",
        },
      ),
    })
    expect(inputs).toHaveProperty("before", {
      base: DateTime.fromObject(
        {
          hour: 9,
          minute: 0,
        },
        {
          zone: "Europe/Madrid",
        },
      ),
    })
    expect(inputs).toHaveProperty("timezone", IANAZone.create("Europe/Madrid"))
    expect(inputs).toHaveProperty("prohibitedDays", [])
    expect(inputs.prohibitedDates.length).toBeGreaterThan(220) // It's OK the number is almost the same as twice as `H:Spain`.
    expect(inputs.prohibitedDates).toContainEqual(
      Interval.fromDateTimes(
        DateTime.fromObject(
          {
            year: 2023,
            month: 1,
            day: 23,
          },
          {
            zone: "Europe/Madrid",
          },
        ).startOf("day"),
        DateTime.fromObject(
          {
            year: 2023,
            month: 1,
            day: 23,
          },
          {
            zone: "Europe/Madrid",
          },
        ).endOf("day"),
      ),
    )
    expect(inputs.prohibitedDates).toContainEqual(
      Interval.fromDateTimes(
        DateTime.fromObject(
          {
            year: 2023,
            month: 1,
            day: 22,
          },
          {
            zone: "Europe/Madrid",
          },
        ).startOf("day"),
        DateTime.fromObject(
          {
            year: 2023,
            month: 1,
            day: 22,
          },
          {
            zone: "Europe/Madrid",
          },
        ).endOf("day"),
      ),
    )
    expect(inputs).toHaveProperty("noBlockLabel", "no-block")
    expect(inputs).toHaveProperty("commitStatusContext", "block-merge-based-on-time")
    expect(inputs).toHaveProperty("commitStatusDescriptionWithSuccess", "The PR could be merged")
    expect(inputs).toHaveProperty(
      "commitStatusDescriptionWhileBlocking",
      "The PR can't be merged based on time, which is due to your organization's policy",
    )
    expect(inputs).toHaveProperty("commitStatusURL", null)
    expect(inputs).toHaveProperty("rawBaseBranches", ["main"])
  })

  test("returns a valid instance with base branches", () => {
    const inSpy = jest.spyOn(core, "getInput")
    inSpy.mockImplementation(
      (name) =>
        ({
          token: "abc",
          after: "17:30",
          before: "09:00",
          timezone: "Europe/Madrid",
          "prohibited-days-dates": "H:Spain, BH:Spain",
          "no-block-label": "",
          "commit-status-context": "",
          "commit-status-description-with-success": "",
          "commit-status-description-while-blocking": "",
          "commit-status-url": "",
          "base-branches": "develop, feature/special",
        })[name] as any,
    )
    const inputs = new Inputs()
    expect(inputs).toHaveProperty("token", "abc")
    expect(inputs).toHaveProperty("after", {
      base: DateTime.fromObject(
        {
          hour: 17,
          minute: 30,
        },
        {
          zone: "Europe/Madrid",
        },
      ),
    })
    expect(inputs).toHaveProperty("before", {
      base: DateTime.fromObject(
        {
          hour: 9,
          minute: 0,
        },
        {
          zone: "Europe/Madrid",
        },
      ),
    })
    expect(inputs).toHaveProperty("timezone", IANAZone.create("Europe/Madrid"))
    expect(inputs).toHaveProperty("prohibitedDays", [])
    expect(inputs.prohibitedDates.length).toBeGreaterThan(240)
    expect(inputs.prohibitedDates).toContainEqual(
      Interval.fromDateTimes(
        DateTime.fromObject(
          {
            year: 2023,
            month: 1,
            day: 23,
          },
          {
            zone: "Europe/Madrid",
          },
        ).startOf("day"),
        DateTime.fromObject(
          {
            year: 2023,
            month: 1,
            day: 23,
          },
          {
            zone: "Europe/Madrid",
          },
        ).endOf("day"),
      ),
    )
    expect(inputs.prohibitedDates).toContainEqual(
      Interval.fromDateTimes(
        DateTime.fromObject(
          {
            year: 2023,
            month: 1,
            day: 22,
          },
          {
            zone: "Europe/Madrid",
          },
        ).startOf("day"),
        DateTime.fromObject(
          {
            year: 2023,
            month: 1,
            day: 22,
          },
          {
            zone: "Europe/Madrid",
          },
        ).endOf("day"),
      ),
    )
    expect(inputs).toHaveProperty("noBlockLabel", "no-block")
    expect(inputs).toHaveProperty("commitStatusContext", "block-merge-based-on-time")
    expect(inputs).toHaveProperty("commitStatusDescriptionWithSuccess", "The PR could be merged")
    expect(inputs).toHaveProperty(
      "commitStatusDescriptionWhileBlocking",
      "The PR can't be merged based on time, which is due to your organization's policy",
    )
    expect(inputs).toHaveProperty("commitStatusURL", null)
    expect(inputs).toHaveProperty("rawBaseBranches", ["develop", "feature/special"])
  })

  test("returns an error with invalid zone", () => {
    const inSpy = jest.spyOn(core, "getInput")
    inSpy.mockImplementation((name) => ({ token: "abc", timezone: "Unknown/Abc" })[name] as any)
    expect(() => new Inputs()).toThrow(new Error('the zone "Unknown/Abc" is not supported'))
  })

  test("returns an error with invalid after", () => {
    const inSpy = jest.spyOn(core, "getInput")
    inSpy.mockImplementation((name) => ({ token: "abc", timezone: "UTC+3", after: "1220" })[name] as any)
    expect(() => new Inputs()).toThrow(new Error('Invalid "after" was given. The example format is "16:30 on Monday"'))
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
        })[name] as any,
    )
    expect(() => new Inputs()).toThrow(new Error('Invalid "before" was given. The example format is "16:30 on Monday"'))
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
        })[name] as any,
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
        })[name] as any,
    )
    expect(() => new Inputs()).toThrow(new Error('the input "20:13" can\'t be parsed as format yyyy-MM-dd'))
  })

  test("returns an error with invalid ranged dates", () => {
    const inSpy = jest.spyOn(core, "getInput")
    inSpy.mockImplementation(
      (name) =>
        ({
          token: "abc",
          timezone: "UTC+3",
          after: "21:00",
          before: "01:20",
          "prohibited-days-dates": "mm/20:13",
        })[name] as any,
    )
    expect(() => new Inputs()).toThrow(new Error('the input "mm/20:13" can\'t be parsed as ISO 8601'))
  })

  describe("baseBranches()", () => {
    const inSpy = jest.spyOn(core, "getInput")
    inSpy.mockImplementation(
      (name) =>
        ({
          token: "abc",
          after: "17:30",
          before: "09:00",
          timezone: "Europe/Madrid",
          "prohibited-days-dates": "H:Spain, BH:Spain",
          "no-block-label": "",
          "commit-status-context": "",
          "commit-status-description-with-success": "",
          "commit-status-description-while-blocking": "",
          "commit-status-url": "",
          "base-branches": "(default), special/one, /^feature\\/.*/",
        })[name] as any,
    )
    const inputs = new Inputs()
    expect(inputs.baseBranches("main")).toEqual([/^main$/, /^special\/one$/, /^feature\/.*/])
  })
})
