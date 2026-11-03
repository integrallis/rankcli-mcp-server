---
name: fix-seo-regressions
description: Find and fix what regressed in a site's SEO and AI-search readiness with RankCLI. Audit, compare against a committed baseline or a previous report with rankcli diff, fix the new findings in the codebase by their code, re-run and report the delta honestly. Use when a CI gate failed, a score dropped, pages stopped ranking or being cited by ChatGPT, Claude or Perplexity, or after a framework upgrade or a redesign.
---

# Fix SEO regressions

RankCLI runs 280+ SEO and AI-search checks against a live URL or a build directory. The CLI
is free, needs no account and runs on the machine you are on. Nothing is sent to RankCLI
unless the user has logged in.

## 1. Audit, against what it used to be

```bash
npx -y @rankcli/cli audit --url https://example.com --max-pages 5 -o json > after.json
```

- With a committed baseline (`.rankcli/baseline.json`, see `check-site-before-deploy`):
  add `--baseline .rankcli/baseline.json`; the report's `baseline` object lists `new`,
  `fixed` and `unchanged`, and the console prints "New since baseline" first.
- With an older report: `npx -y @rankcli/cli diff before.json after.json` prints new findings,
  fixed findings and the score moves per category; `-o json` for the document.
- With nothing to compare: the report alone. `--max-pages` defaults to 5 (the sitemap seeds
  the list); `1` for one page. `--dir dist --url https://example.com` audits a build.
- Exit codes: `0` ran, `1` a gate tripped, `2` bad invocation, `3` the site was unreachable or
  answered 4xx/5xx (score 0). A `3` means fix the site, not the SEO.

## 2. Read the report

Top-level fields: `url`, `score`, `pagesAudited`, `pages[]` (each page's score and counts),
`framework`, `healthScores` (`overall`, `crawlability`, `indexability`, `onPage`, `content`,
`links`, `performance`, `security`, `aiReadiness`, `social`, `localSeo`, `accessibility`),
`issues[]`, `baseline`, `gate`, `notes`, `exitCode`.

Each issue has `code`, `severity` (`error` | `warning` | `notice`), `category`, `title`,
`description`, `impact`, `howToFix`, `affectedUrls[]` and sometimes `details`. One code can
affect many pages.

```bash
jq '[.issues[] | select(.severity=="error" or .severity=="warning")] | map({code, severity, pages: (.affectedUrls | length)})' after.json
```

## 3. Triage in this order

1. **New since the baseline**, whatever its severity: that is the regression.
2. **Errors**.
3. **Indexability and crawlability**: a `noindex` on a page that should rank, a canonical
   pointing at another host or at staging, robots.txt blocking what should be crawled, pages
   answering 4xx/5xx, a search crawler refused at the edge (`SEARCH_CRAWLER_BLOCKED_AT_EDGE`),
   metadata that reaches Googlebot but not other agents (`METADATA_STREAMED_FOR_BOTS`) or that
   landed in `<body>` (`METADATA_OUTSIDE_HEAD`), navigation missing from the HTML
   (`NAV_NOT_IN_HTML`). These make everything else irrelevant.
4. **On-page**: missing or duplicate titles and descriptions, heading structure, broken links.
5. **Structured data** and Open Graph.
6. **AI search**: the AI search crawlers disallowed or refused (`AI_SEARCH_BOTS_DISALLOWED`,
   `AI_SEARCH_CRAWLER_BLOCKED_AT_EDGE`), content an answer engine cannot quote (no direct
   answer after a question heading, statistics without a source, comparisons in prose).

Notices are informational; do not spend the user's time on them unless asked. A `noindex` on
`/login`, `/signup`, `/account` or an app shell is intended. Disallowing the training crawlers
(`AI_TRAINING_BOTS_DISALLOWED`) is a policy choice that costs no visibility; leave it.

## 4. Fix in the codebase

- Follow each issue's `howToFix`. Put files where the framework serves static files: `public/`
  for Vite, Next.js, Nuxt and Astro, `static/` for SvelteKit and Hugo, `wwwroot/` for ASP.NET,
  the theme for WordPress. The `framework` field says which.
- Never invent facts for structured data: no made-up addresses, phone numbers, ratings or
  reviews. Ask the user for anything the page does not already state.
- Do not add a `<link rel="canonical">` to a client-rendered app shell that serves every route.
- One change per issue code, so the re-run shows which fix worked.

RankCLI can propose fixes from inside the repository:

```bash
npx -y @rankcli/cli fix --url https://example.com --dry-run          # preview only
npx -y @rankcli/cli fix --url https://example.com --only META_DESC_MISSING,SITEMAP_MISSING
```

## 5. Re-run and report

Run the same audit again, then `rankcli diff after.json after2.json`. Report the score before
and after and the codes that disappeared. If the score fell, say so; do not hide it. When the
regression is gone, refresh the baseline (`-o json > .rankcli/baseline.json`) and commit it.
