# GitHub Rulesets: Requiring Passing Tests for PRs

By separating testing into its own GitHub Action, you can configure your repository rules to require that specific workflow to pass before any pull request can be merged into `main`. This prevents merging broken code that fails tests.

## 1. Separate the Test Workflow

Make sure your CI tests run on Pull Requests. This means you need a workflow (e.g., `test.yml` or a `test` job in your main workflow) that triggers on `pull_request`:

```yaml
on:
  pull_request:
    branches:
      - main
```

When this runs, GitHub Actions registers check statuses for these jobs (e.g., a job named `Tests`).

## 2. Set Up a Ruleset in GitHub

1. Go to your repository on GitHub.
2. Click on **Settings**.
3. In the left sidebar, under "Code and automation", click **Rules** -> **Rulesets**.
4. Click **New ruleset** -> **New branch ruleset**.

### Basic Configuration
- **Ruleset Name**: `Require Tests for Main` (or any descriptive name).
- **Enforcement status**: Set to **Active**.

### Target branches
1. Under "Target branches", click **Add target** -> **Include by pattern**.
2. Enter `main` to target your default branch.

### Branch Rules
1. Scroll down to "Branch rules".
2. Check the box for **Require a pull request before merging**.
   - (Optional) Check **Require approvals** if you also want code review approvals.
3. Check the box for **Require status checks to pass**.
4. Under "Require status checks to pass", click **Add checks**.
5. A modal will appear listing recent status checks. Search for and select the name of your test job (e.g., `test` or `Tests`).
   - *Note: If you just created the GitHub Action, you might need to run it at least once on a Pull Request so that GitHub populates this list.*
6. Ensure **Require branches to be up to date before merging** is checked (optional but recommended, as it ensures the PR tests against the latest `main` code).

## 3. Save the Ruleset

Click **Create** at the bottom of the page.

Now, whenever a pull request is opened against `main`, GitHub will automatically block the "Merge pull request" button until the specified test job completes successfully.
