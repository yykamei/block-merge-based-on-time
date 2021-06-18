import { context } from "@actions/github"
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
  const found = payload.pull_request.labels.find((l) => l.name === inputs.noBlockLabel)
  if (found != null) {
    // Always make the pull request success
    console.log("handlePull makes the pull request success due to the label")
    return
  }
  if (shouldBlock(inputs)) {
    // Make the pull request pending
    console.log("handlePull makes the pull request pending")
  } else {
    // Make the pull request success
    console.log("handlePull makes the pull request success")
  }
}
