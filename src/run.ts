import { context, getOctokit } from "@actions/github"
import { Inputs } from "./inputs"
import { shouldBlock } from "./should-block"
import { PullRequestEvent } from "@octokit/webhooks-definitions/schema"

export async function run(): Promise<void> {
  const inputs = new Inputs()

  switch (context.eventName) {
    case "schedule":
      return handleSchedule(inputs)
    case "pull_request":
      return handlePull(inputs, context.payload as PullRequestEvent)
  }
}

async function handleSchedule(inputs: Inputs): Promise<void> {
  if (shouldBlock(inputs)) {
    // Make all pull requests pending aside from labeled
    console.log("handleSchedule makes all pull requests pending")
  } else {
    // Make all pull requests success
    console.log("handleSchedule makes all pull requests success")
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

  const found = payload.pull_request.labels.find((l) => l.name === inputs.noBlockLabel)
  if (found == null && shouldBlock(inputs)) {
    state = "pending"
    description = inputs.commitStatusDescriptionWhileBlocking
  }

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
