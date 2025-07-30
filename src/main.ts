import { setFailed, error } from "@actions/core"
import { run } from "./run"

error("Start!")
process.on("unhandledRejection", handleError)
run().catch(handleError)

function handleError(err: unknown): void {
  if (err instanceof Error) {
    setFailed(`Unhandled error: ${err.message}\n${err.stack}`)
  } else {
    setFailed(`Unhandled error: ${err}`)
  }
}
