# Block Merge Based on Time

Some organizations have a policy prohibiting their members from merging pull requests because handling troubles after working hours or on holidays would be difficult. This action helps them to ensure such a policy is enforced.

Block Merge Based on Time
[creates a commit status](https://docs.github.com/en/rest/reference/repos#create-a-commit-status) for each pull request
head commit. If the time is during **blocking**, it creates a commit status with **pending**. On the other hand, it
creates a commit status with **success** when it's not the time to block. You can circumvent this block with a `no-block` label by default. This might be useful when you merge pull requests because of an emergency or
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
      - unlabeled
  schedule:
    - cron: "*/30 * * * *"

jobs:
  block:
    runs-on: ubuntu-latest
    permissions:
      pull-requests: read
      statuses: write
    steps:
      - uses: yykamei/block-merge-based-on-time@main
        id: block
        with:
          timezone: Pacific/Honolulu
          after: "17:30, 16:30 on Monday"
          before: 09:00
          base-branches: "(default)"
          prohibited-days-dates: "Sunday, 2021-10-01, 2021-12-29/2022-01-04, H:United States, BH:United States"
      - run: echo pr-blocked=${{ steps.block.outputs.pr-blocked }}
        if: github.event_name == 'pull_request'
```

### Action inputs

These are all available inputs.

| Name                                       | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | Required | Default                                                                            |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------- |
| `timezone`                                 | Time zone to use. Default is UTC                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `true`   | -                                                                                  |
| `after`                                    | The time to start blocking merge. You can set exception times for specific days with comma-separated values. For example, the value could be "17:30, 16:30 on Monday, 15:00 on Friday." You can omit the base hour with specific days, so "16:30 on Monday" is also valid. Note you should omit the base hour from both `after` and `before` because it assumes the base hour as `"00:00"` if they are omitted. You will see unexpected behavior if only one parameter includes the base hour.                                                                    | `false`  | -                                                                                  |
| `before`                                   | The time to stop blocking merge. You can set exception times for specific days with comma-separated values. For example, the value could be "09:00, 08:00 on Monday" You can omit the base hour with specific days, so "08:00 on Monday" is also valid. Note you should omit the base hour from both `after` and `before` because it assumes the base hour as `"00:00"` if they are omitted. You will see unexpected behavior if only one parameter includes the base hour.                                                                                       | `false`  | -                                                                                  |
| `base-branches`                            | The comma-separated base branches of pull requests. This tool will block only pull requests from the base branches listed in this parameter. You can set regular expressions surrounding with `/` like `/staging\/.*/` and just set string literals like `develop`. Also, the value `(default)` is acceptable, meaning pull requests merged into the default branch will be blocked. The default value is `/^.*$/` for backward compatibility.                                                                                                                    | `false`  | `"/^.*$/"`                                                                         |
| `prohibited-days-dates`                    | The comma-separated days or dates to block merge for all day. You can also specify regional holidays with special syntax, such as "H:St. Barthélemy" and "BH:St. Barthélemy", which stand for "holidays of St. Barthélemy" and "before holidays of St. Barthélemy." The word after "H:" or "BH:" is a region name that is listed in [`src/holidays.json`](https://raw.githubusercontent.com/yykamei/block-merge-based-on-time/main/src/holidays.json) as a JSON key. For example, the value could be "Sunday, 2021-08-01, 2021-08-06/2021-08-10, H:Côte d’Ivoire" | `false`  | `""`                                                                               |
| `no-block-label`                           | The label to indicate the pull request should not be blocked                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `false`  | `no-block`                                                                         |
| `commit-status-context`                    | The commit status context                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | `false`  | `block-merge-based-on-time`                                                        |
| `commit-status-description-with-success`   | The commit status description shown with success                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `false`  | `The PR could be merged`                                                           |
| `commit-status-description-while-blocking` | The commit status description shown while blocking                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `false`  | `The PR can't be merged based on time, which is due to your organization's policy` |
| `commit-status-url`                        | The commit status URL to describe why this action is conducted                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `false`  | `""`                                                                               |
| `token`                                    | The GitHub token used to create an authenticated client                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `false`  | `GITHUB_TOKEN`                                                                     |

### Action outputs

- `pr-blocked` — A boolean value to indicate the pull reuqest is blocked. This is set only when the `pull_request` event occurs.

## Regional holidays

This tool supports blocking merges based on regional holidays. For example, February 11th is "National Foundation Day"
in Japan, you can block merges on such a holiday via `prohibited-days-dates` with `H:Japan`. In addition, you can
also block on the day before the regional holiday with `BH:Japan`.

Block Merge Based on Time supports **232** regions, taking advantage of Google Calendar API, and the data is updated
periodically.
See [`src/holidays.json`](https://raw.githubusercontent.com/yykamei/block-merge-based-on-time/main/src/holidays.json) to
check all available regions.

## Contributing

Please take a look at the [CONTRIBUTING.md](CONTRIBUTING.md). It's always a pleasure to receive any contributions 😄
