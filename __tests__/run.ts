import * as core from "@actions/core"
import * as github from "@actions/github"
import * as api from "../src/github"
import { run } from "../src/run"
import { Inputs } from "../src/inputs"

describe("run", () => {
  const octokit = jest.fn()

  beforeAll(() => {
    jest.useFakeTimers()
    jest.spyOn(github, "getOctokit").mockImplementation(() => octokit as any)
    jest.spyOn(core, "debug").mockImplementation(jest.fn)
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  describe.each([["schedule"], ["workflow_dispatch"]])("when the event is %s", (event) => {
    const inputs = {
      token: "abc",
      after: "12:20",
      before: "16:00",
      timezone: "Pacific/Honolulu",
      "prohibited-days-dates": "Sunday, 2021-07-01",
      "no-block-label": "Emergency",
      "commit-status-context": "BB",
      "commit-status-description-with-success": "",
      "commit-status-description-while-blocking": "",
      "commit-status-url": "",
      "base-branches": "/^.*$/",
    }

    beforeEach(() => {
      Object.defineProperty(github.context, "eventName", { value: event })
      jest.spyOn(github.context, "repo", "get").mockReturnValue({ owner: "foo", repo: "special-repo" } as any)
    })

    test.each([
      {
        now: "2021-06-17T13:30:00-10:00",
        inputBaseBranches: "/^.*$/",
        pulls: [
          { baseBranch: "main", labels: ["foo", "bug"] } as any,
          { baseBranch: "develop", labels: ["feature", "enhancement"] } as any,
        ],
        expectedStates: ["pending", "pending"],
      },
      {
        now: "2021-06-17T13:30:00-10:00",
        inputBaseBranches: "(default)",
        pulls: [
          { baseBranch: "main", labels: ["foo", "bug"] } as any,
          { baseBranch: "main", labels: ["Emergency", "bug"] } as any,
          { baseBranch: "develop", labels: ["feature", "enhancement"] } as any,
          { baseBranch: "feature/abc", labels: ["feature", "enhancement"] } as any,
        ],
        expectedStates: ["pending", "success", "success", "success"],
      },
      {
        now: "2021-06-17T13:30:00-10:00",
        inputBaseBranches: "(default), staging, /feature/.*/",
        pulls: [
          { baseBranch: "main", labels: ["foo", "bug"] } as any,
          { baseBranch: "main", labels: ["Emergency", "bug"] } as any,
          { baseBranch: "develop", labels: ["feature", "enhancement"] } as any,
          { baseBranch: "staging", labels: [] } as any,
          { baseBranch: "staging", labels: ["Emergency"] } as any,
          { baseBranch: "feature/abc", labels: ["feature", "enhancement"] } as any,
          { baseBranch: "feature/foo", labels: ["Emergency", "enhancement"] } as any,
        ],
        expectedStates: ["pending", "success", "success", "pending", "success", "pending", "success"],
      },
      {
        now: "2021-06-17T09:30:00-10:00",
        inputBaseBranches: "(default), staging, /feature/.*/",
        pulls: [
          { baseBranch: "main", labels: ["foo", "bug"] } as any,
          { baseBranch: "main", labels: ["Emergency", "bug"] } as any,
          { baseBranch: "develop", labels: ["feature", "enhancement"] } as any,
          { baseBranch: "staging", labels: [] } as any,
          { baseBranch: "staging", labels: ["Emergency"] } as any,
          { baseBranch: "feature/abc", labels: ["feature", "enhancement"] } as any,
          { baseBranch: "feature/foo", labels: ["Emergency", "enhancement"] } as any,
        ],
        expectedStates: ["success", "success", "success", "success", "success", "success", "success"],
      },
    ])(
      "creates commit statuses: $inputBaseBranches, $pulls, $expectedStates",
      async ({ now, inputBaseBranches, pulls, expectedStates }) => {
        jest.setSystemTime(new Date(now))
        jest.spyOn(core, "getInput").mockImplementation(
          (name) =>
            ({
              ...inputs,
              "base-branches": inputBaseBranches,
            })[name] as any,
        )
        const defaultBranch = jest.spyOn(api, "defaultBranch").mockImplementation(async () => "main")
        const pullsCall = jest.spyOn(api, "pulls").mockImplementation(async () => pulls)
        const createCommitStatus = jest.spyOn(api, "createCommitStatus").mockImplementation(async () => {})
        await run()
        expect(defaultBranch).toHaveBeenCalledWith(octokit, "foo", "special-repo")
        expect(pullsCall).toHaveBeenCalledWith(octokit, "foo", "special-repo", "BB")
        pulls.forEach((pull, idx) => {
          expect(createCommitStatus).toHaveBeenCalledWith(octokit, pull, expect.any(Inputs), expectedStates[idx])
        })
      },
    )

    test("throws an error when some pull requests failed to get updated while successfully updating others", async () => {
      jest.setSystemTime(new Date("2021-06-17T13:30:00-10:00"))
      jest.spyOn(core, "getInput").mockImplementation(
        (name) =>
          ({
            ...inputs,
          })[name] as any,
      )
      const defaultBranch = jest.spyOn(api, "defaultBranch").mockImplementation(async () => "main")
      const pullsCall = jest
        .spyOn(api, "pulls")
        .mockImplementation(async () => [
          { number: 3, baseBranch: "main", labels: [] } as any,
          { number: 4, baseBranch: "main", labels: [] } as any,
          { number: 5, baseBranch: "main", labels: [] } as any,
          { number: 6, baseBranch: "main", labels: [] } as any,
        ])
      const createCommitStatus = jest.spyOn(api, "createCommitStatus").mockImplementation(async (_, pull) => {
        if (pull.number === 4 || pull.number === 6) {
          throw new Error("This SHA and context has reached the maximum number of statuses.")
        }
      })
      const coreError = jest.spyOn(core, "error").mockImplementation(jest.fn)
      try {
        await run()
      } catch (e: any) {
        expect(defaultBranch).toHaveBeenCalledWith(octokit, "foo", "special-repo")
        expect(pullsCall).toHaveBeenCalledWith(octokit, "foo", "special-repo", "BB")
        expect(createCommitStatus).toHaveBeenCalledWith(
          octokit,
          {
            number: 3,
            baseBranch: "main",
            labels: [],
          },
          expect.any(Inputs),
          "pending",
        )
        expect(createCommitStatus).toHaveBeenCalledWith(
          octokit,
          {
            number: 4,
            baseBranch: "main",
            labels: [],
          },
          expect.any(Inputs),
          "pending",
        )
        expect(createCommitStatus).toHaveBeenCalledWith(
          octokit,
          {
            number: 5,
            baseBranch: "main",
            labels: [],
          },
          expect.any(Inputs),
          "pending",
        )
        expect(createCommitStatus).toHaveBeenCalledWith(
          octokit,
          {
            number: 6,
            baseBranch: "main",
            labels: [],
          },
          expect.any(Inputs),
          "pending",
        )
        expect(coreError).toHaveBeenCalledWith(
          '#4\'s head commit is too old to get updated with the commit status context "BB". See the details: Error: This SHA and context has reached the maximum number of statuses.',
        )
        expect(coreError).toHaveBeenCalledWith(
          '#6\'s head commit is too old to get updated with the commit status context "BB". See the details: Error: This SHA and context has reached the maximum number of statuses.',
        )
        expect(e.message).toEqual(`Some pull requests failed to get updated with the commit status context "BB".
The failed pull requests are:

- #4
- #6

You can resolve the problems with these actions: updating the pull requests with new commits, or closing them.`)
      }
    })
  })

  describe("when the event is pull_request", () => {
    beforeEach(() => {
      Object.defineProperty(github.context, "eventName", { value: "pull_request" })
      jest.spyOn(core, "getInput").mockImplementation(
        (name) =>
          ({
            token: "abc",
            after: "17:00",
            before: "09:00",
            timezone: "Pacific/Honolulu",
            "prohibited-days-dates": "",
            "no-block-label": "Emergency",
            "commit-status-context": "my-blocker",
            "commit-status-description-with-success": "",
            "commit-status-description-while-blocking": "",
            "commit-status-url": "",
            "base-branches": "(default), /staging-.*/, /feature/foo/.*/",
          })[name] as any,
      )
    })

    test.each`
      baseBranch            | labels                         | expectedState | prBlocked
      ${"main"}             | ${["bug", "foo"]}              | ${"pending"}  | ${"true"}
      ${"main"}             | ${["bug", "Emergency"]}        | ${"success"}  | ${"false"}
      ${"develop"}          | ${["bug", "foo"]}              | ${"success"}  | ${"false"}
      ${"test"}             | ${["bug", "foo"]}              | ${"success"}  | ${"false"}
      ${"feature/bar/1234"} | ${["bug", "foo"]}              | ${"success"}  | ${"false"}
      ${"feature/foo/38"}   | ${["bug", "foo"]}              | ${"pending"}  | ${"true"}
      ${"feature/foo/39"}   | ${["bug", "foo", "Emergency"]} | ${"success"}  | ${"false"}
      ${"staging-qa"}       | ${["bug", "foo"]}              | ${"pending"}  | ${"true"}
      ${"staging-qa"}       | ${["bug", "foo", "Emergency"]} | ${"success"}  | ${"false"}
    `(
      "creates a commit status with $expectedState: $baseBranch, $labels",
      async ({ baseBranch, labels, expectedState, prBlocked }) => {
        const setOutput = jest.spyOn(core, "setOutput").mockImplementation(jest.fn)
        const pullData = {
          owner: "FAORG",
          repo: "repo1",
          number: 324,
          baseBranch,
          labels,
          sha: "commit1",
        }
        jest.setSystemTime(new Date("2021-07-26T21:48:00-10:00"))
        const pull = jest.spyOn(api, "pull").mockImplementation(async () => ({
          defaultBranch: "main",
          pull: pullData,
        }))
        const createCommitStatus = jest.spyOn(api, "createCommitStatus").mockImplementation(async () => {})
        jest.spyOn(github.context, "repo", "get").mockReturnValue({ owner: "FAORG", repo: "repo1" } as any)
        Object.defineProperty(github.context, "payload", { value: { pull_request: { number: 324 } } } as any)
        await run()
        expect(pull).toHaveBeenCalledWith(octokit, "FAORG", "repo1", "my-blocker", 324)
        expect(setOutput).toHaveBeenCalledWith("pr-blocked", prBlocked)
        expect(createCommitStatus).toHaveBeenCalledWith(octokit, pullData, expect.any(Inputs), expectedState)
      },
    )
  })

  describe.each([["push", "release", "create"]])("when the event is %s", (event) => {
    beforeEach(() => {
      Object.defineProperty(github.context, "eventName", { value: event })
    })

    test("does not throw an error", async () => {
      const warning = jest.spyOn(core, "warning").mockImplementation(jest.fn)
      await run()

      expect(warning).toHaveBeenCalledWith(`This action does not support the event "${event}"`)
    })
  })
})
