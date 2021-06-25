import * as core from "@actions/core"
import * as github from "@actions/github"
import { run } from "../src/run"

describe("run", () => {
  const octokit = {
    graphql: jest.fn(),
    rest: {
      repos: {
        createCommitStatus: jest.fn(),
        listCommitStatusesForRef: jest.fn(),
      },
    },
  }

  beforeAll(() => {
    jest.useFakeTimers()
    jest.spyOn(core, "getInput").mockImplementation(
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
    jest.spyOn(github, "getOctokit").mockImplementation(() => octokit as any)
  })

  afterAll(() => {
    jest.useRealTimers()
  })

  describe.each([["schedule"], ["workflow_dispatch"]])("when the event is %s", (event) => {
    beforeEach(() => {
      Object.defineProperty(github.context, "eventName", { value: event })
      jest.spyOn(github.context, "repo", "get").mockReturnValue({ owner: "foo", repo: "special-repo" } as any)
      octokit.graphql.mockResolvedValueOnce({
        data: {
          repository: {
            pullRequests: {
              pageInfo: {
                hasNextPage: true,
                endCursor: "Y3Vyc29yOnYyOpK5MjAyMS0wNi0xOVQwNjoyODoyNiswOTowMM4oKH4V",
              },
              edges: [
                {
                  cursor: "Y3Vyc29yOnYyOpK5MjAyMS0wNi0xOVQwNjoyODoyNiswOTowMM4oKH4V",
                  node: {
                    id: "MDExOlB1bGxSZXF1ZXN0NjczNzQyMzU3",
                    number: 13,
                    title: "Create c.js",
                    labels: {
                      edges: [
                        {
                          node: {
                            name: "Emergency",
                          },
                        },
                      ],
                    },
                    commits: {
                      edges: [
                        {
                          node: {
                            commit: {
                              oid: "a7ba8efba8eff971a716ee178ae492f34c07844b",
                              message: "Update c.js",
                              status: null,
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      })
      octokit.graphql.mockResolvedValueOnce({
        data: {
          repository: {
            pullRequests: {
              pageInfo: {
                hasNextPage: false,
                endCursor: "Y3Vyc29yOnYyOpK5MjAyMS0wNS0zMVQwOToyNToxOSswOTowMM4nNe7z",
              },
              edges: [
                {
                  cursor: "Y3Vyc29yOnYyOpK5MjAyMS0wNi0xOVQwNjoyNjozMSswOTowMM4oKHtr",
                  node: {
                    id: "MDExOlB1bGxSZXF1ZXN0NjczNzQxNjc1",
                    number: 12,
                    title: "Create b.js",
                    labels: {
                      edges: [],
                    },
                    commits: {
                      edges: [
                        {
                          node: {
                            commit: {
                              oid: "f7ef543f6bf7d321117817743d8e4f0c4fb8136f",
                              message: "Create b.js",
                              status: {
                                contexts: [
                                  {
                                    context: "block-merge-based-on-time",
                                    state: "SUCCESS",
                                  },
                                ],
                              },
                            },
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  cursor: "Y3Vyc29yOnYyOpK5MjAyMS0wNi0xOVQwNjoyNjowMSswOTowMM4oKHq4",
                  node: {
                    id: "MDExOlB1bGxSZXF1ZXN0NjczNzQxNDk2",
                    number: 11,
                    title: "Create a.js",
                    labels: {
                      edges: [],
                    },
                    commits: {
                      edges: [
                        {
                          node: {
                            commit: {
                              oid: "1a097c106ca94999dee6249ba3e8c09190be9304",
                              message: "Create a.js",
                              status: null,
                            },
                          },
                        },
                      ],
                    },
                  },
                },
                {
                  cursor: "Y3Vyc29yOnYyOpK5MjAyMS0wNS0zMVQwOToyNToxOSswOTowMM4nNe7z",
                  node: {
                    id: "MDExOlB1bGxSZXF1ZXN0NjU3ODQ2MDAz",
                    number: 10,
                    title: "Add empty files",
                    labels: {
                      edges: [],
                    },
                    commits: {
                      edges: [
                        {
                          node: {
                            commit: {
                              oid: "69c87dcf047328c682ede7914d84fbcf422bcbc8",
                              message: "fixup! Add empty files",
                              status: null,
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              ],
            },
          },
        },
      })
    })

    test("makes all pull requests pending, aside from ones with labels", async () => {
      jest.setSystemTime(new Date("2021-06-17T13:30:00-10:00"))
      await run()
      expect(octokit.graphql).toHaveBeenNthCalledWith(1, expect.any(String), {
        owner: "foo",
        repo: "special-repo",
        after: null,
      })
      expect(octokit.graphql).toHaveBeenNthCalledWith(2, expect.any(String), {
        owner: "foo",
        repo: "special-repo",
        after: "Y3Vyc29yOnYyOpK5MjAyMS0wNi0xOVQwNjoyODoyNiswOTowMM4oKH4V",
      })
      expect(octokit.rest.repos.createCommitStatus).toHaveBeenNthCalledWith(1, {
        owner: "foo",
        repo: "special-repo",
        sha: "a7ba8efba8eff971a716ee178ae492f34c07844b",
        state: "success",
        context: "block-merge-based-on-time",
        description: "The PR could be merged",
        target_url: undefined,
      })
      expect(octokit.rest.repos.createCommitStatus).toHaveBeenNthCalledWith(2, {
        owner: "foo",
        repo: "special-repo",
        sha: "f7ef543f6bf7d321117817743d8e4f0c4fb8136f",
        state: "pending",
        context: "block-merge-based-on-time",
        description: "The PR can't be merged based on time, which is due to your organization's policy",
        target_url: undefined,
      })
      expect(octokit.rest.repos.createCommitStatus).toHaveBeenNthCalledWith(3, {
        owner: "foo",
        repo: "special-repo",
        sha: "1a097c106ca94999dee6249ba3e8c09190be9304",
        state: "pending",
        context: "block-merge-based-on-time",
        description: "The PR can't be merged based on time, which is due to your organization's policy",
        target_url: undefined,
      })
      expect(octokit.rest.repos.createCommitStatus).toHaveBeenNthCalledWith(4, {
        owner: "foo",
        repo: "special-repo",
        sha: "69c87dcf047328c682ede7914d84fbcf422bcbc8",
        state: "pending",
        context: "block-merge-based-on-time",
        description: "The PR can't be merged based on time, which is due to your organization's policy",
        target_url: undefined,
      })
    })

    test("makes all pull requests success but don't create status if it's already success", async () => {
      jest.setSystemTime(new Date("2021-06-17T11:30:00-10:00"))
      await run()
      expect(octokit.graphql).toHaveBeenNthCalledWith(1, expect.any(String), {
        owner: "foo",
        repo: "special-repo",
        after: null,
      })
      expect(octokit.graphql).toHaveBeenNthCalledWith(2, expect.any(String), {
        owner: "foo",
        repo: "special-repo",
        after: "Y3Vyc29yOnYyOpK5MjAyMS0wNi0xOVQwNjoyODoyNiswOTowMM4oKH4V",
      })
      expect(octokit.rest.repos.createCommitStatus).toHaveBeenNthCalledWith(1, {
        owner: "foo",
        repo: "special-repo",
        sha: "a7ba8efba8eff971a716ee178ae492f34c07844b",
        state: "success",
        context: "block-merge-based-on-time",
        description: "The PR could be merged",
        target_url: undefined,
      })
      expect(octokit.rest.repos.createCommitStatus).not.toHaveBeenCalledWith(
        // It's already been success
        expect.objectContaining({
          sha: "f7ef543f6bf7d321117817743d8e4f0c4fb8136f",
        })
      )
      expect(octokit.rest.repos.createCommitStatus).toHaveBeenNthCalledWith(2, {
        owner: "foo",
        repo: "special-repo",
        sha: "1a097c106ca94999dee6249ba3e8c09190be9304",
        state: "success",
        context: "block-merge-based-on-time",
        description: "The PR could be merged",
        target_url: undefined,
      })
      expect(octokit.rest.repos.createCommitStatus).toHaveBeenNthCalledWith(3, {
        owner: "foo",
        repo: "special-repo",
        sha: "69c87dcf047328c682ede7914d84fbcf422bcbc8",
        state: "success",
        context: "block-merge-based-on-time",
        description: "The PR could be merged",
        target_url: undefined,
      })
    })
  })

  describe("when the event is pull_request", () => {
    beforeEach(() => {
      Object.defineProperty(github.context, "eventName", { value: "pull_request" })
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

  describe.each([["push", "release", "create"]])("when the event is %s", (event) => {
    beforeEach(() => {
      Object.defineProperty(github.context, "eventName", { value: event })
    })

    test("throws an error", async () => {
      try {
        await run()
      } catch(e: any) {
        expect(e.message).toEqual(`This action does not support the event "${event}"`)
      }
    })
  })
})
