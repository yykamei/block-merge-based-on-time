import { context, getOctokit } from "@actions/github"
import { Inputs } from "./inputs"
import { shouldBlock } from "./should-block"
import { createCommitStatus, defaultBranch, pull, pulls } from "./github"
import type { ErrorPullRequest } from "./types"

export async function run(): Promise<void> {
  const inputs = new Inputs()

  switch (context.eventName) {
    case "schedule":
    case "workflow_dispatch":
      return handleAllPulls(inputs)
    case "pull_request":
      return handlePull(inputs)
    default:
      throw new Error(`This action does not support the event "${context.eventName}"`)
  }
}

async function handleAllPulls(inputs: Inputs): Promise<void> {
  const octokit = getOctokit(inputs.token)
  const { owner, repo } = context.repo
  const branch = await defaultBranch(octokit, owner, repo)
  const results = await pulls(octokit, owner, repo, inputs.commitStatusContext)
  const isShouldBlock = shouldBlock(inputs)
  const errors: ErrorPullRequest[] = []

  for (const pull of results) {
    // TODO: shouldBlock() should decide which labels and base branches should be treated as "no block."
    const state =
      inputs.baseBranches(branch).some((b) => b.test(pull.baseBranch)) &&
      isShouldBlock &&
      !pull.labels.includes(inputs.noBlockLabel)
        ? "pending"
        : "success"
    try {
      await createCommitStatus(octokit, pull, inputs, state)
    } catch (error) {
      console.error(
        `#${pull.number}'s head commit is too old to get updated with the commit status context "${inputs.commitStatusContext}". See the details: ${error}`
      )
      errors.push({ pull, error })
    }
  }

  if (errors.length > 0) {
    throw new Error(
      `Some pull requests failed to get updated with the commit status context "${inputs.commitStatusContext}".
The failed pull requests are:

${errors.map((e) => `- #${e.pull.number}`).join("\n")}`
    )
  }
}

async function handlePull(inputs: Inputs): Promise<void> {
  const octokit = getOctokit(inputs.token)
  const { owner, repo } = context.repo
  const number = context.payload.pull_request?.number
  if (number == null) {
    throw new Error(`handlePull can only be used for a pull request event`)
  }
  const result = await pull(octokit, owner, repo, inputs.commitStatusContext, number)

  // TODO: shouldBlock() should decide which labels and base branches should be treated as "no block."
  const state =
    inputs.baseBranches(result.defaultBranch).some((b) => b.test(result.pull.baseBranch)) &&
    shouldBlock(inputs) &&
    !result.pull.labels.includes(inputs.noBlockLabel)
      ? "pending"
      : "success"
  return createCommitStatus(octokit, result.pull, inputs, state)
}
