import { GitHub } from "@actions/github/lib/utils"
import { Inputs } from "./inputs"
import type { PullRequestStatus } from "./types"

interface Pull {
  readonly number: number
  readonly title: string
  readonly baseRefName: string
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
            readonly context: {
              readonly state: string
            } | null
          } | null
        }
      }
    }[]
  }
}

interface RepositoryResponse {
  readonly repository: {
    readonly defaultBranchRef: {
      readonly name: string
    }
  }
}

interface PullResponse {
  readonly repository: {
    readonly defaultBranchRef: {
      readonly name: string
    }
    readonly pullRequest: Pull
  }
}

interface PullsResponse {
  readonly repository: {
    readonly defaultBranchRef: {
      readonly name: string
    }
    readonly pullRequests: {
      readonly pageInfo: {
        readonly hasNextPage: boolean
        readonly endCursor: string | null
      }
      readonly edges: {
        readonly node: Pull
      }[]
    }
  }
}

export async function createCommitStatus(
  octokit: InstanceType<typeof GitHub>,
  pullRequestStatus: PullRequestStatus,
  inputs: Inputs,
  state: "success" | "pending"
): Promise<void> {
  if (pullRequestStatus.state === state) {
    return
  }
  const { owner, repo, sha } = pullRequestStatus
  const targetUrl = inputs.commitStatusURL ?? undefined
  const context = inputs.commitStatusContext
  let description: string
  switch (state) {
    case "success": {
      description = inputs.commitStatusDescriptionWithSuccess
      break
    }
    case "pending": {
      description = inputs.commitStatusDescriptionWhileBlocking
      break
    }
  }
  octokit.rest.repos.createCommitStatus({
    owner,
    repo,
    sha,
    state,
    context,
    description,
    target_url: targetUrl,
  })
}

export async function defaultBranch(
  octokit: InstanceType<typeof GitHub>,
  owner: string,
  repo: string
): Promise<string> {
  const result: RepositoryResponse = await octokit.graphql(
    `
query($owner: String!, $repo: String!) {
  repository(owner: $owner, name: $repo) {
    defaultBranchRef {
      name
    }
  }
}`,
    { owner, repo }
  )
  return result.repository.defaultBranchRef.name
}

export async function pull(
  octokit: InstanceType<typeof GitHub>,
  owner: string,
  repo: string,
  contextName: string,
  pullNumber: number
): Promise<{ readonly defaultBranch: string; readonly pull: PullRequestStatus }> {
  const result: PullResponse = await octokit.graphql(
    `
query($owner: String!, $repo: String!, $contextName: String!, $pullNumber: Int!) {
  repository(owner: $owner, name: $repo) {
    defaultBranchRef {
      name
    }
    pullRequest(number: $pullNumber) {
      number
      title
      baseRefName
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
                context(name: $contextName) {
                  state
                }
              }
            }
          }
        }
      }
    }
  }
}`,
    { owner, repo, contextName, pullNumber }
  )
  const commit = result.repository.pullRequest.commits.edges[0]
  if (commit == null) {
    throw new Error("commit should be present")
  }
  const pull: PullRequestStatus = {
    owner,
    repo,
    number: pullNumber,
    baseBranch: result.repository.pullRequest.baseRefName,
    sha: commit.node.commit.oid,
    labels: result.repository.pullRequest.labels.edges.map(({ node: { name } }) => name),
    state: commit.node.commit.status?.context?.state,
  }
  return {
    defaultBranch: result.repository.defaultBranchRef.name,
    pull,
  }
}

export async function pulls(
  octokit: InstanceType<typeof GitHub>,
  owner: string,
  repo: string,
  contextName: string
): Promise<PullRequestStatus[]> {
  let after: string | null = null
  let hasNextPage = true
  let statuses: PullRequestStatus[] = []
  while (hasNextPage) {
    const result: PullsResponse = await octokit.graphql(
      `
query($owner: String!, $repo: String!, $contextName: String!, $after: String) {
  repository(owner: $owner, name: $repo) {
    defaultBranchRef {
      name
    }
    pullRequests(after: $after, first: 100, states: OPEN, orderBy: { field: CREATED_AT, direction: DESC}) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          number
          title
          baseRefName
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
                    context(name: $contextName) {
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
      { owner, repo, contextName, after }
    )
    hasNextPage = result.repository.pullRequests.pageInfo.hasNextPage
    after = result.repository.pullRequests.pageInfo.endCursor

    const data = result.repository.pullRequests.edges.flatMap(({ node: pr }) =>
      pr.commits.edges.map(({ node: commit }) => ({
        owner,
        repo,
        number: pr.number,
        baseBranch: pr.baseRefName,
        sha: commit.commit.oid,
        labels: pr.labels.edges.map((l) => l.node.name),
        state: commit.commit.status?.context?.state,
      }))
    )
    statuses = [...statuses, ...data]
  }
  return statuses
}
