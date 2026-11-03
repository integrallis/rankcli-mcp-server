---
name: check-site-before-deploy
description: Check a site before a deploy with RankCLI, so a stray noindex, a canonical pointing at staging, a page answering 5xx, metadata that only Googlebot gets or a blocked AI crawler fails the build instead of costing weeks of traffic. Audits the build directory or the preview URL and gates on errors, a score floor or new findings against a committed baseline, in GitHub Actions or any CI. Use when asked to add an SEO check to CI, gate a deploy on SEO, audit a preview deployment or the build output, or stop SEO regressions.
---

# Check a site before a deploy

Treat SEO like a linter: audit what is about to ship and fail the job when it regresses. The
280+ checks run in the CI runner; no account and no API key are needed.

## 1. Decide what to audit

| What | How | Catches |
|---|---|---|
| The build output, before deploying | `rankcli audit --dir dist --url https://example.com` | everything in the HTML: titles, canonicals, metadata in `<body>`, structured data, links, images, content |
| The preview deployment | `rankcli audit --url "$PREVIEW_URL"` | the above plus the host: redirects, TLS, security headers, robots.txt, sitemap, crawler access at the edge |
| Production, on a schedule | `rankcli audit --url https://example.com` | changes outside the repo: CDN rules, DNS, the CMS |

`--dir` serves the directory the way a static host would and skips the host-level checks a
directory cannot have. A preview behind a password or bypass header takes
`--header "x-vercel-protection-bypass: $BYPASS"` or `--cookie "session=..."`; the headers go
only to the audited site.

## 2. Commit a baseline first

An existing site has findings. Without a baseline the first gated build fails on all of them
instead of on regressions:

```bash
mkdir -p .rankcli
npx -y @rankcli/cli audit --url https://example.com -o json > .rankcli/baseline.json
git add .rankcli/baseline.json
```

With `--baseline`, the severity rule counts only findings that are not in the file; the
report still lists the old ones. Save the baseline with the same `--max-pages` the gate runs
with (a finding is keyed by its code and the page's path).

## 3. GitHub Actions

```yaml
name: SEO gate
on:
  pull_request:
  push:
    branches: [main]
  schedule:
    - cron: '0 8 * * 1'   # weekly, so a change outside this repo is caught too

permissions:
  contents: read
  pull-requests: write   # the PR comment

jobs:
  seo:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7          # for rankcli.config.json and the baseline
      - uses: integrallis/rankcli-action@v1
        with:
          url: https://example.com          # or the preview URL from your deploy step
          fail-on: error,score<80
          baseline: .rankcli/baseline.json
```

To audit the build output instead of a URL, build first and pass `dir: dist` with the `url`
the build is for. The Action annotates the run with the findings and keeps one PR comment up
to date, posted on regressions only. Other inputs: `headers` (one `Name: value` per line, for
protected previews), `max-pages`, `report-file`, `config`.

## 4. Any other CI

```bash
npm install -g @rankcli/cli
rankcli audit --url "$DEPLOY_URL" --fail-on error,score<80 --baseline .rankcli/baseline.json -o json > report.json
```

Exit codes: `0` passed, `1` the gate tripped, `2` bad invocation or an invalid config or
baseline file, `3` the URL was unreachable or answered 4xx/5xx. A down site never passes.
Stdout is one JSON document even on failure, so the artifact is always readable.
`-o sarif` feeds GitHub Code Scanning (`github/codeql-action/upload-sarif`), `-o junit` a test
reporter.

The same rules live in `rankcli.config.json` (`failOn`, `minScore`, `budgets`, `baseline`,
`ignore`, `headers`, `dir`), which `audit` and the Action read the same way; flags win.

## 5. Choosing the rules

- Start with `fail-on: error`. Errors are a noindex on an indexable page, a canonical pointing
  elsewhere, a missing title, a search crawler refused at the edge, a 5xx.
- Add `score<N` at the current score minus 5 once the baseline is known; raise it as you fix things.
- `score:aiReadiness<70` gates one category. `warning` is strict; use it with a baseline.
- `ignore` in `rankcli.config.json` drops a code or a page pattern with a stated reason; the
  ignored findings are still counted in the report, never silently dropped.

## 6. When the gate fails

Read the report with the `fix-seo-regressions` skill: what is new against the baseline, then
errors, then indexability, then the rest. Fix the cause; do not loosen the gate to make the
build green. When the failure is a crawler being refused, the
`is-my-site-blocked-from-ai-search` skill has the fix by bot class.
