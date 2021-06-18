import * as core from "@actions/core"
import * as github from "@actions/github"
import { run } from "../src/run"

describe("run", () => {
  beforeAll(() => {
    jest.useFakeTimers()
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
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  describe("when the event is schedule", () => {
    beforeEach(() => {
      Object.defineProperty(github.context, "eventName", { value: "schedule" })
    })

    test("makes all pull requests pending, aside from ones with labels", async () => {
      jest.setSystemTime(new Date("2021-06-17T13:30:00-10:00"))
      const inSpy = jest.spyOn(global.console, "log")
      // TODO: Exclude pull requests with the label
      await run()
      expect(inSpy).toHaveBeenCalledWith("handleSchedule makes all pull requests pending")
    })

    test("makes all pull requests success", async () => {
      jest.setSystemTime(new Date("2021-06-17T11:30:00-10:00"))
      const inSpy = jest.spyOn(global.console, "log")
      await run()
      expect(inSpy).toHaveBeenCalledWith("handleSchedule makes all pull requests success")
    })
  })

  describe("when the event is schedule", () => {
    beforeEach(() => {
      Object.defineProperty(github.context, "eventName", {
        value: "pull_request",
      } as any)
    })

    test("makes the pull request success due to the attached label", async () => {
      jest.setSystemTime(new Date("2021-06-17T13:30:00-10:00"))
      Object.defineProperty(github.context, "payload", {
        value: { pull_request: { labels: [{ name: "Emergency" }] } },
      } as any)
      const inSpy = jest.spyOn(global.console, "log")
      await run()
      expect(inSpy).toHaveBeenCalledWith("handlePull makes the pull request success due to the label")
    })

    test("makes the pull request pending", async () => {
      jest.setSystemTime(new Date("2021-06-17T13:30:00-10:00"))
      Object.defineProperty(github.context, "payload", {
        value: { pull_request: { labels: [{ name: "bug" }] } },
      } as any)
      const inSpy = jest.spyOn(global.console, "log")
      await run()
      expect(inSpy).toHaveBeenCalledWith("handlePull makes the pull request pending")
    })

    test("makes the pull request succeed", async () => {
      jest.setSystemTime(new Date("2021-06-17T23:00:10-10:00"))
      Object.defineProperty(github.context, "payload", {
        value: { pull_request: { labels: [{ name: "bug" }] } },
      } as any)
      const inSpy = jest.spyOn(global.console, "log")
      await run()
      expect(inSpy).toHaveBeenCalledWith("handlePull makes the pull request success")
    })
  })
})
