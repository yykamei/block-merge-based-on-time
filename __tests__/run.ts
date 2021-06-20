import * as core from "@actions/core"
import * as github from "@actions/github"
import { run } from "../src/run"

describe("run", () => {
  const octokit = {
    rest: {
      repos: {
        createCommitStatus: jest.fn(),
        listCommitStatusesForRef: jest.fn(),
      },
    },
  }

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
          "commit-status-context": "",
          "commit-status-description-with-success": "",
          "commit-status-description-while-blocking": "",
          "commit-status-url": "",
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

    test.each([
      {
        state: "success",
        description: "The PR could be merged",
        labels: [{ name: "bug" }, { name: "project A" }],
        statuses: [{ context: "CI", state: "failure" }],
        time: "2021-06-17T09:48:00-10:00",
        shouldCreate: true,
      },
      {
        state: "success",
        description: "The PR could be merged",
        labels: [{ name: "bug" }, { name: "project A" }],
        statuses: [
          { context: "CI", state: "failure" },
          { context: "block-merge-based-on-time", state: "success" },
        ],
        time: "2021-06-17T09:48:00-10:00",
        shouldCreate: false,
      },
      {
        state: "success",
        description: "The PR could be merged",
        labels: [{ name: "Emergency" }],
        statuses: [{ context: "CI", state: "pending" }],
        time: "2021-06-17T13:30:00-10:00",
        shouldCreate: true,
      },
      {
        state: "success",
        description: "The PR could be merged",
        labels: [{ name: "Emergency" }, { name: "project A" }],
        statuses: [
          { context: "CI", state: "success" },
          { context: "block-merge-based-on-time", state: "success" },
        ],
        time: "2021-06-17T13:30:00-10:00",
        shouldCreate: false,
      },
      {
        state: "pending",
        description: "The PR can't be merged based on time, which is due to your organization's policy",
        labels: [{ name: "bug" }],
        statuses: [],
        time: "2021-06-17T13:30:00-10:00",
        shouldCreate: true,
      },
      {
        state: "pending",
        description: "The PR can't be merged based on time, which is due to your organization's policy",
        labels: [{ name: "bug" }],
        statuses: [{ context: "block-merge-based-on-time", state: "pending" }],
        time: "2021-06-17T13:30:00-10:00",
        shouldCreate: false,
      },
    ])(
      "makes the pull request $state with $description when $labels, $statuses, and $time are passed",
      async ({ state, description, labels, statuses, time, shouldCreate }) => {
        jest.setSystemTime(new Date(time))
        Object.defineProperty(github.context, "payload", {
          value: {
            repository: { owner: { login: "foo" }, name: "special-repo" },
            pull_request: { head: { sha: "abcdefg" }, labels },
          },
        } as any)
        octokit.rest.repos.listCommitStatusesForRef.mockResolvedValue({ data: statuses })
        await run()
        if (shouldCreate) {
          expect(octokit.rest.repos.createCommitStatus).toHaveBeenCalledWith({
            owner: "foo",
            repo: "special-repo",
            sha: "abcdefg",
            state,
            context: "block-merge-based-on-time",
            description,
            target_url: undefined,
          })
        } else {
          expect(octokit.rest.repos.createCommitStatus).not.toHaveBeenCalled()
        }
      }
    )
  })
})
