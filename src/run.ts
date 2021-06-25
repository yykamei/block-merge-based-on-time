import { context, getOctokit } from "@actions/github"
import { Inputs } from "./inputs"
import { shouldBlock } from "./should-block"
import { PullRequestEvent } from "@octokit/webhooks-definitions/schema"

export async function run(): Promise<void> {
  const inputs = new Inputs()

  switch (context.eventName) {
    case "schedule":
    case "workflow_dispatch":
      return handleAllPulls(inputs)
    case "pull_request":
      return handlePull(inputs, context.payload as PullRequestEvent)
    default:
      throw new Error(`This action does not support the event "${context.eventName}"`)
  }
}

async function handleAllPulls(inputs: Inputs): Promise<void> {
  const octokit = getOctokit(inputs.token)
  const { owner, repo } = context.repo
  const statuses = await fetchPullRequestStatuses(inputs, owner, repo)

  const runBulk = (state: "pending" | "success") => {
    statuses.forEach((s) => {
      let expected = state
      let description =
        state === "success" ? inputs.commitStatusDescriptionWithSuccess : inputs.commitStatusDescriptionWhileBlocking
      if (s.labels.includes(inputs.noBlockLabel)) {
        expected = "success"
        description = inputs.commitStatusDescriptionWithSuccess
      }
      if (s.state?.toLowerCase() === expected) {
        // We don't have to recreate commit status because the state has been already expected value.
        return
      }
      octokit.rest.repos.createCommitStatus({
        owner,
        repo,
        sha: s.sha,
        state: expected,
        context: inputs.commitStatusContext,
        description,
        target_url: inputs.commitStatusURL || undefined,
      })
    })
  }

  if (shouldBlock(inputs)) {
    runBulk("pending")
  } else {
    runBulk("success")
  }
}

async function handlePull(inputs: Inputs, payload: PullRequestEvent): Promise<void> {
  const octokit = getOctokit(inputs.token)
  const owner = payload.repository.owner.login
  const repo = payload.repository.name
  const sha = payload.pull_request.head.sha
  const context = inputs.commitStatusContext
  const target_url = inputs.commitStatusURL || undefined
  let state: "success" | "pending" = "success"
  let description = inputs.commitStatusDescriptionWithSuccess

  const noBlockLabelFound = payload.pull_request.labels.find((l) => l.name === inputs.noBlockLabel)
  if (noBlockLabelFound == null && shouldBlock(inputs)) {
    state = "pending"
    description = inputs.commitStatusDescriptionWhileBlocking
  }

  const statuses = await octokit.rest.repos
    .listCommitStatusesForRef({
      owner,
      repo,
      ref: sha,
      per_page: 100,
    })
    .then((res) => res.data.filter((d) => d.context === context && d.state === state))
  if (statuses.length === 0) {
    octokit.rest.repos.createCommitStatus({
      owner,
      repo,
      sha,
      state,
      context,
      description,
      target_url,
    })
  }
}

interface StatusesResponse {
  readonly repository: {
    readonly pullRequests: {
      readonly pageInfo: {
        readonly hasNextPage: boolean
        readonly endCursor: string | null
      }
      readonly edges: {
        readonly node: {
          readonly number: number
          readonly title: string
          readonly labels: {
            readonly edges: {
              readonly node: {
                readonly name: string
              }
            }[]
          }
          readonly commits: {
            readonly edges: {
              readonly node: {
                readonly commit: {
                  readonly oid: string
                  readonly message: string
                  readonly status: {
                    readonly contexts: {
                      readonly context: string
                      readonly state: string
                    }[]
                  } | null
                }
              }
            }[]
          }
        }
      }[]
    }
  }
}

interface MyPullRequestStatus {
  readonly number: number
  readonly sha: string
  readonly labels: readonly string[]
  readonly state?: string
}

async function fetchPullRequestStatuses(inputs: Inputs, owner: string, repo: string): Promise<MyPullRequestStatus[]> {
  const octokit = getOctokit(inputs.token)
  let after: string | null = null
  let hasNextPage = true
  let statuses: MyPullRequestStatus[] = []

  while (hasNextPage) {
    const res: StatusesResponse = await octokit.graphql(
      `
query($owner: String!, $repo: String!, $after: String) {
  repository(owner: $owner, name: $repo) {
    pullRequests(after: $after, first: 100, states: OPEN, orderBy: { field: CREATED_AT, direction: DESC}) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          number
          title
          labels(first: 100) {
            edges {
              node {
                name
              }
            }
          }
          commits(last: 1) {
            edges {
              node {
                commit {
                  oid
                  message
                  status {
                    contexts {
                      context
                      state
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}`,
      { owner, repo, after }
    )
    hasNextPage = res.repository.pullRequests.pageInfo.hasNextPage
    after = res.repository.pullRequests.pageInfo.endCursor

    const data = res.repository.pullRequests.edges.flatMap((pr) =>
      pr.node.commits.edges.map((c) => ({
        number: pr.node.number,
        sha: c.node.commit.oid,
        labels: pr.node.labels.edges.map((l) => l.node.name),
        state: c.node.commit.status?.contexts.find((s) => s.context === inputs.commitStatusContext)?.state,
      }))
    )
    statuses = [...statuses, ...data]
  }

  return statuses
}
