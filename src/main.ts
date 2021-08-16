import * as core from "@actions/core"
import { setFailed } from "@actions/core"
import { run } from "./run"

process.on("unhandledRejection", handleError)
run().catch(handleError)

function handleError(err: unknown): void {
  core.error(`Unhandled error: ${err}`)
  setFailed(`Unhandled error: ${err}`)
}
