import * as core from "@actions/core"
import * as github from "@actions/github"
import { run } from "../src/run"

describe("run", () => {
  const apiCall = jest.fn()
  const octokit = { rest: { repos: { createCommitStatus: apiCall } } }

  beforeAll(() => {
    jest.useFakeTimers()
    const getInput = jest.spyOn(core, "getInput")
    getInput.mockImplementation(
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
    const getOctokit = jest.spyOn(github, "getOctokit")
    getOctokit.mockImplementation(() => octokit as any)
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

  describe("when the event is pull_request", () => {
    beforeEach(() => {
      Object.defineProperty(github.context, "eventName", {
        value: "pull_request",
      } as any)
    })

    test("makes the pull request success due to the attached label", async () => {
      jest.setSystemTime(new Date("2021-06-17T13:30:00-10:00"))
      Object.defineProperty(github.context, "payload", {
        value: {
          repository: { owner: { login: "foo" }, name: "special-repo" },
          pull_request: { head: { sha: "abcdefg" }, labels: [{ name: "Emergency" }] },
        },
      } as any)
      await run()
      expect(apiCall).toHaveBeenCalledWith({
        owner: "foo",
        repo: "special-repo",
        sha: "abcdefg",
        state: "success",
        context: "block-merge-based-on-time",
        description: "The PR could be merged",
        target_url: undefined,
      })
    })

    test("makes the pull request pending", async () => {
      jest.setSystemTime(new Date("2021-06-17T13:30:00-10:00"))
      Object.defineProperty(github.context, "payload", {
        value: {
          repository: { owner: { login: "foo" }, name: "special-repo" },
          pull_request: { head: { sha: "abcdefg" }, labels: [{ name: "bug" }] },
        },
      } as any)
      await run()
      expect(apiCall).toHaveBeenCalledWith({
        owner: "foo",
        repo: "special-repo",
        sha: "abcdefg",
        state: "pending",
        context: "block-merge-based-on-time",
        description: "The PR can't be merged based on time, which is due to your organization's policy",
        target_url: undefined,
      })
    })

    test("makes the pull request succeed", async () => {
      jest.setSystemTime(new Date("2021-06-17T23:00:10-10:00"))
      Object.defineProperty(github.context, "payload", {
        value: {
          repository: { owner: { login: "foo" }, name: "special-repo" },
          pull_request: { head: { sha: "abcdefg" }, labels: [{ name: "bug" }] },
        },
      } as any)
      await run()
      expect(apiCall).toHaveBeenCalledWith({
        owner: "foo",
        repo: "special-repo",
        sha: "abcdefg",
        state: "success",
        context: "block-merge-based-on-time",
        description: "The PR could be merged",
        target_url: undefined,
      })
    })
  })
})
