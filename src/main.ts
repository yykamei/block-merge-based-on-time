import { setFailed } from "@actions/core"
import { run } from "./run"

process.on("unhandledRejection", handleError)
run().catch(handleError)

function handleError(err: unknown): void {
  setFailed(`Unhandled error: ${err}`)
}
