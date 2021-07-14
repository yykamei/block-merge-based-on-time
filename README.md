# Block Merge Based on Time

Some organizations have the policy to prohibit their members from merging pull requests because it would be difficult to
handle troubles after working hours or on holidays. This action helps them to ensure such a policy in enforcement.

Block Merge Based on Time
[creates a commit status](https://docs.github.com/en/rest/reference/repos#create-a-commit-status) for each pull request
head commit. If the time is during **blocking**, it creates a commit status with **pending**. On the other hand, it
creates a commit status with **success** while it's not the time to block. You can circumvent this block with a specific
label named `no-block` by default. This might be useful when you have to merge pull requests because of an emergency or
irregular maintenance.

## Usage

Create a new workflow like this:

```yaml
name: Block Merge Based on Time
on:
  pull_request:
    types:
      - opened
      - reopened
      - synchronize
      - labeled
  schedule:
    - cron: "*/30 * * * *"

jobs:
  block:
    runs-on: ubuntu-latest
    steps:
      - uses: yykamei/block-merge-based-on-time@main
        with:
          after: 17:30
          before: 09:00
          timezone: Pacific/Honolulu
          prohibited-days-dates: "Sunday, 2021-10-01, 2021-12-29/2022-01-04"
```

### Action inputs

These are all available inputs.

| Name                                       | Description                                                                                                                                   | Required | Default                                                                            |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------- |
| `after`                                    | The time to start blocking merge                                                                                                              | `true`   | -                                                                                  |
| `before`                                   | The time to stop blocking merge                                                                                                               | `true`   | -                                                                                  |
| `timezone`                                 | Time zone to use. Default is UTC                                                                                                              | `true`   | -                                                                                  |
| `prohibited-days-dates`                    | The comma-separated days or dates to stop blocking merge all day. For example, the value could be "Sunday, 2021-08-01, 2021-08-06/2021-08-10" | `false`  | `""`                                                                               |
| `no-block-label`                           | The label to indicate the pull request should not be blocked                                                                                  | `false`  | `no-block`                                                                         |
| `commit-status-context`                    | The commit status context                                                                                                                     | `false`  | `block-merge-based-on-time`                                                        |
| `commit-status-description-with-success`   | The commit status description shown with success                                                                                              | `false`  | `The PR could be merged`                                                           |
| `commit-status-description-while-blocking` | The commit status description shown while blocking                                                                                            | `false`  | `The PR can't be merged based on time, which is due to your organization's policy` |
| `commit-status-url`                        | The commit status URL to describe why this action is conducted                                                                                | `false`  | `""`                                                                               |
| `token`                                    | The GitHub token used to create an authenticated client                                                                                       | `false`  | `GITHUB_TOKEN`                                                                     |

## Contributing

Please take a look at
the [CONTRIBUTING.md](https://github.com/yykamei/block-merge-based-on-time/blob/main/CONTRIBUTING.md). It's always a
pleasure to receive any contributions 😄
