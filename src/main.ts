import { setFailed } from "@actions/core"

process.on("unhandledRejection", handleError)
main().catch(handleError)

async function main(): Promise<void> {
  console.log("Hello")
}

function handleError(err: unknown): void {
  console.error(err)
  setFailed(`Unhandled error: ${err}`)
}
