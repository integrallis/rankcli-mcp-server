---
name: seo-ci-gate
description: Add an SEO and AI-search regression gate to CI with RankCLI, so a deploy that ships a stray noindex, a canonical pointing at staging, a page answering 5xx, or a blocked AI crawler fails the build instead of costing weeks of traffic. Use when asked to put SEO checks in CI or GitHub Actions, add a pre-deploy SEO check, audit preview deployments, or stop SEO regressions.
---

# SEO regression gate in CI

Treat SEO like a linter: run RankCLI on the deployed (or preview) URL and fail the job when it
regresses. The checks run in the CI runner; no account is needed. An API key only links the
run to a RankCLI dashboard.

## 1. Establish the baseline first

Before adding a gate, run one audit and fix the errors, or the first gated build fails on
existing problems rather than regressions:

```bash
npx -y @rankcli/cli audit --url https://example.com -o json > rankcli-report.json
jq '{score, errors: [.issues[] | select(.severity=="error") | .code] | unique}' rankcli-report.json
```

## 2. GitHub Actions

```yaml
name: SEO gate
on:
  push:
    branches: [main]
  pull_request:
  schedule:
    - cron: '0 8 * * 1'   # weekly, so a change outside this repo (CDN, DNS, CMS) is caught too

jobs:
  seo:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write   # only for the PR comment
    steps:
      - uses: integrallis/rankcli-action@v1
        id: audit
        with:
          url: https://example.com        # or the preview deployment URL
          fail-on-error: 'true'
          score-threshold: '80'           # 0 disables; set it 5 below the current score
          comment-on-pr: 'true'
      - run: echo "score=${{ steps.audit.outputs.score }} passed=${{ steps.audit.outputs.passed }}"
```

Optional inputs: `api-key` (links the run to the dashboard; falls back to `RANKCLI_API_KEY`),
`slack-webhook` / `discord-webhook` with `alert-on: error,failure`.

To audit a preview deployment, pass the URL the deploy step outputs (Vercel, Netlify and
Cloudflare Pages all expose one) instead of the production URL.

## 3. Any other CI (GitLab, CircleCI, Jenkins, a Makefile)

```bash
npx -y @rankcli/cli audit --url "$DEPLOY_URL" --fail-on error --min-score 80
```

Exit codes: `0` passed, `1` the gate tripped, `2` bad invocation, `3` the URL was unreachable or
answered 4xx/5xx. A down site never passes. Add `-o json > report.json` to keep the report as an
artifact; stdout is one JSON document even on failure.

## 4. Choosing thresholds

- Start with `--fail-on error` (or `fail-on-error: 'true'`) only. Errors are things like noindex
  on an indexable page, a canonical pointing elsewhere, missing title, blocked crawlers, 5xx.
- Add a score floor once the baseline is known: current score minus 5. Raise it as you fix things.
- `--fail-on warning` is strict; use it on a docs or marketing site that is already clean.

## 5. When the gate fails

Read the report with the `seo-audit` skill: errors first, then indexability, then everything
else. Fix the cause in the codebase; do not loosen the gate to make the build green.
