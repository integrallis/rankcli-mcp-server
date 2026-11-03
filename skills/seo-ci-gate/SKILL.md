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
      - uses: actions/checkout@v7          # for rankcli.config.json and the baseline
      - uses: integrallis/rankcli-action@v1
        id: audit
        with:
          url: https://example.com        # or the preview deployment URL
          fail-on: error,score<80         # set the score floor 5 below the current score
          baseline: .rankcli/baseline.json  # optional: only new findings fail the build
      - run: echo "score=${{ steps.audit.outputs.score }} passed=${{ steps.audit.outputs.passed }}"
```

Optional inputs: `dir` (audit the build output instead of a URL; `url` then names the site it
is built for), `headers` (for protected previews), `max-pages`, `report-file`, `api-key`
(links the run to the dashboard; falls back to `RANKCLI_API_KEY`), `slack-webhook` /
`discord-webhook` with `alert-on: error,failure`. The Action annotates the run and keeps one
PR comment up to date, posted on regressions only.

To audit a preview deployment, pass the URL the deploy step outputs (Vercel, Netlify and
Cloudflare Pages all expose one) instead of the production URL.

## 3. Any other CI (GitLab, CircleCI, Jenkins, a Makefile)

```bash
npx -y @rankcli/cli audit --url "$DEPLOY_URL" --fail-on error,score<80 --baseline .rankcli/baseline.json
```

Exit codes: `0` passed, `1` the gate tripped, `2` bad invocation, `3` the URL was unreachable or
answered 4xx/5xx. A down site never passes. Add `-o json > report.json` to keep the report as an
artifact; stdout is one JSON document even on failure.

## 4. Choosing thresholds

- Start with `--fail-on error` only. Errors are things like noindex on an indexable page, a
  canonical pointing elsewhere, missing title, a search crawler refused at the edge, 5xx.
- Add `score<N` once the baseline is known: current score minus 5. Raise it as you fix things.
  `score:aiReadiness<70` gates one category.
- `--fail-on warning` is strict; use it with a committed baseline (`rankcli audit -o json >
  .rankcli/baseline.json`), so only new findings fail the build.

## 5. When the gate fails

Read the report with the `fix-seo-regressions` skill: new findings first, then errors, then
indexability, then everything else. Fix the cause in the codebase; do not loosen the gate to
make the build green. The fuller version of this skill is `check-site-before-deploy`.
