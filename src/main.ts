import { setFailed, error } from "@actions/core"
import { run } from "./run"

error("Start!")
process.on("unhandledRejection", handleError)
run().catch(handleError)

function handleError(err: unknown): void {
  setFailed(`Unhandled error: ${err}`)
}
