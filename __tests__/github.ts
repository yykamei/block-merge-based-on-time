import { createCommitStatus, defaultBranch, pull, pulls } from "../src/github"
import * as core from "@actions/core";

describe("createCommitStatus", () => {
  beforeAll(() => {
    jest.spyOn(core, "debug").mockImplementation(jest.fn)
  })

  test("creates a commit status to make it pending", async () => {
    const pull = {
      owner: "Foo",
      repo: "bar",
      number: 3,
      baseBranch: "develop",
      sha: "c1",
      labels: ["bug"],
    }
    const octokit: any = {
      rest: {
        repos: {
          createCommitStatus: jest.fn(),
        },
      },
    }
    const inputs: any = {
      commitStatusURL: null,
      commitStatusContext: "blocker",
      commitStatusDescriptionWithSuccess: "You can merge",
      commitStatusDescriptionWhileBlocking: "No merge!",
    }
    await createCommitStatus(octokit, pull, inputs, "pending")
    expect(octokit.rest.repos.createCommitStatus).toHaveBeenNthCalledWith(1, {
      owner: "Foo",
      repo: "bar",
      sha: "c1",
      state: "pending",
      context: "blocker",
      description: "No merge!",
      target_url: undefined,
    })
  })

  test("creates a commit status to make it success", async () => {
    const pull = {
      owner: "Foo",
      repo: "bar",
      number: 3,
      baseBranch: "develop",
      sha: "c1",
      labels: ["bug"],
    }
    const octokit: any = {
      rest: {
        repos: {
          createCommitStatus: jest.fn(),
        },
      },
    }
    const inputs: any = {
      commitStatusURL: "http://example.com",
      commitStatusContext: "blocker",
      commitStatusDescriptionWithSuccess: "You can merge",
      commitStatusDescriptionWhileBlocking: "No merge!",
    }
    await createCommitStatus(octokit, pull, inputs, "success")
    expect(octokit.rest.repos.createCommitStatus).toHaveBeenNthCalledWith(1, {
      owner: "Foo",
      repo: "bar",
      sha: "c1",
      state: "success",
      context: "blocker",
      description: "You can merge",
      target_url: "http://example.com",
    })
  })

  test("does not create a commit status because the specified sha has been the desired state: pending", async () => {
    const pull = {
      owner: "Foo",
      repo: "bar",
      number: 3,
      baseBranch: "develop",
      sha: "c1",
      labels: ["bug"],
      state: "pending",
    }
    const octokit: any = {
      rest: {
        repos: {
          createCommitStatus: jest.fn(),
        },
      },
    }
    const inputs: any = {
      commitStatusURL: null,
      commitStatusContext: "blocker",
      commitStatusDescriptionWithSuccess: "You can merge",
      commitStatusDescriptionWhileBlocking: "No merge!",
    }
    await createCommitStatus(octokit, pull, inputs, "pending")
    expect(octokit.rest.repos.createCommitStatus).not.toHaveBeenCalled()
  })

  test("does not create a commit status because the specified sha has been the desired state: success", async () => {
    const pull = {
      owner: "Foo",
      repo: "bar",
      number: 3,
      baseBranch: "develop",
      sha: "c1",
      labels: ["bug"],
      state: "success",
    }
    const octokit: any = {
      rest: {
        repos: {
          createCommitStatus: jest.fn(),
        },
      },
    }
    const inputs: any = {
      commitStatusURL: "https://www.example.com",
      commitStatusContext: "blocker",
      commitStatusDescriptionWithSuccess: "You can merge",
      commitStatusDescriptionWhileBlocking: "No merge!",
    }
    await createCommitStatus(octokit, pull, inputs, "success")
    expect(octokit.rest.repos.createCommitStatus).not.toHaveBeenCalled()
  })
})

describe("defaultBranch", () => {
  test("fetches the default branch", async () => {
    const octokit: any = {
      graphql: jest.fn(() => ({ repository: { defaultBranchRef: { name: "main" } } })),
    }
    const result = await defaultBranch(octokit, "Foo", "bar")
    expect(result).toEqual("main")
    expect(octokit.graphql).toHaveBeenNthCalledWith(1, expect.any(String), { owner: "Foo", repo: "bar" })
  })
})

describe("pull", () => {
  test("fetches the pull request without commit statuses", async () => {
    const octokit: any = {
      graphql: jest.fn(() => ({
        repository: {
          defaultBranchRef: { name: "main" },
          pullRequest: {
            baseRefName: "develop",
            commits: {
              edges: [{ node: { commit: { oid: "c1" } } }],
            },
            labels: {
              edges: [{ node: { name: "bug" } }],
            },
          },
        },
      })),
    }
    const result = await pull(octokit, "Foo", "bar", "blocker", 3)
    expect(result).toEqual({
      defaultBranch: "main",
      pull: {
        owner: "Foo",
        repo: "bar",
        number: 3,
        baseBranch: "develop",
        sha: "c1",
        labels: ["bug"],
      },
    })
    expect(octokit.graphql).toHaveBeenNthCalledWith(1, expect.any(String), {
      owner: "Foo",
      repo: "bar",
      contextName: "blocker",
      pullNumber: 3,
    })
  })

  test("fetches the pull request with commit statuses", async () => {
    const octokit: any = {
      graphql: jest.fn(() => ({
        repository: {
          defaultBranchRef: { name: "main" },
          pullRequest: {
            baseRefName: "develop",
            commits: {
              edges: [{ node: { commit: { oid: "c3", status: { context: { state: "pending" } } } } }],
            },
            labels: {
              edges: [],
            },
          },
        },
      })),
    }
    const result = await pull(octokit, "Foo", "bar", "blocker", 5)
    expect(result).toEqual({
      defaultBranch: "main",
      pull: {
        owner: "Foo",
        repo: "bar",
        number: 5,
        baseBranch: "develop",
        sha: "c3",
        labels: [],
        state: "pending",
      },
    })
    expect(octokit.graphql).toHaveBeenNthCalledWith(1, expect.any(String), {
      owner: "Foo",
      repo: "bar",
      contextName: "blocker",
      pullNumber: 5,
    })
  })

  test("fetches the pull request with commit statuses, but its context does not exist", async () => {
    const octokit: any = {
      graphql: jest.fn(() => ({
        repository: {
          defaultBranchRef: { name: "main" },
          pullRequest: {
            baseRefName: "develop",
            commits: {
              edges: [{ node: { commit: { oid: "c5", status: { context: null } } } }],
            },
            labels: {
              edges: [],
            },
          },
        },
      })),
    }
    const result = await pull(octokit, "Foo", "bar", "blocker", 7)
    expect(result).toEqual({
      defaultBranch: "main",
      pull: {
        owner: "Foo",
        repo: "bar",
        number: 7,
        baseBranch: "develop",
        sha: "c5",
        labels: [],
      },
    })
    expect(octokit.graphql).toHaveBeenNthCalledWith(1, expect.any(String), {
      owner: "Foo",
      repo: "bar",
      contextName: "blocker",
      pullNumber: 7,
    })
  })
})

describe("pulls", () => {
  test("fetches the pull requests", async () => {
    const octokit: any = {
      graphql: jest
        .fn()
        .mockResolvedValueOnce({
          repository: {
            defaultBranchRef: { name: "main" },
            pullRequests: {
              pageInfo: {
                hasNextPage: true,
                endCursor: "cur1",
              },
              edges: [
                {
                  cursor: "cur1",
                  node: {
                    number: 10,
                    title: "#10",
                    baseRefName: "main",
                    labels: { edges: [{ node: { name: "bug" } }] },
                    commits: {
                      edges: [{ node: { commit: { oid: "c10", status: { context: { state: "pending" } } } } }],
                    },
                  },
                },
              ],
            },
          },
        })
        .mockResolvedValueOnce({
          repository: {
            defaultBranchRef: { name: "main" },
            pullRequests: {
              pageInfo: {
                hasNextPage: false,
                endCursor: "cur2",
              },
              edges: [
                {
                  cursor: "cur2",
                  node: {
                    number: 9,
                    title: "#9",
                    baseRefName: "develop",
                    labels: { edges: [] },
                    commits: {
                      edges: [{ node: { commit: { oid: "c9", status: { context: { state: "success" } } } } }],
                    },
                  },
                },
              ],
            },
          },
        }),
    }
    const result = await pulls(octokit, "Foo", "bar", "blocker!")
    expect(result).toEqual([
      {
        owner: "Foo",
        repo: "bar",
        number: 10,
        baseBranch: "main",
        sha: "c10",
        labels: ["bug"],
        state: "pending",
      },
      {
        owner: "Foo",
        repo: "bar",
        number: 9,
        baseBranch: "develop",
        sha: "c9",
        labels: [],
        state: "success",
      },
    ])
    expect(octokit.graphql).toHaveBeenNthCalledWith(1, expect.any(String), {
      owner: "Foo",
      repo: "bar",
      contextName: "blocker!",
      after: null,
    })
    expect(octokit.graphql).toHaveBeenNthCalledWith(2, expect.any(String), {
      owner: "Foo",
      repo: "bar",
      contextName: "blocker!",
      after: "cur1",
    })
  })
})
