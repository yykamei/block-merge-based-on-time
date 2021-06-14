import { setFailed } from "@actions/core"
import { Inputs } from "./inputs"
import { shouldBlock } from "./shouldBlock"

process.on("unhandledRejection", handleError)
main().catch(handleError)

async function main(): Promise<void> {
  const inputs = new Inputs()
  console.log(shouldBlock(inputs))
}

function handleError(err: unknown): void {
  console.error(err)
  setFailed(`Unhandled error: ${err}`)
}
