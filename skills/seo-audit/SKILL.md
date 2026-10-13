---
name: seo-audit
description: Audit a website's SEO and AI-search (GEO) readiness with RankCLI, read the JSON report, and fix the highest-impact issues in the codebase. Use when asked to check SEO, find why pages are not ranking or not cited by ChatGPT, Claude or Perplexity, review meta tags, structured data, canonicals, robots.txt, llms.txt, Core Web Vitals or AI crawler access, or to check a site before a deploy.
---

# SEO + AI-search audit with RankCLI

RankCLI runs 280+ SEO and GEO checks against a live URL. The CLI is free, needs no account,
and runs on the machine you are on. Nothing is sent to RankCLI unless the user has logged in.

## 1. Run the audit

```bash
npx -y @rankcli/cli audit --url https://example.com -o json --max-pages 5 > rankcli-report.json
```

- `--max-pages` defaults to 5 (the URL plus linked pages). Use `1` for a single page, more for a site.
- `--check-links` also checks for broken links (slower).
- With `-o json`, stdout is exactly one JSON document, even when the audit fails. Progress goes to stderr.
- Exit codes: `0` audit ran, `1` a `--fail-on` / `--min-score` gate tripped, `2` bad invocation,
  `3` the site was unreachable or answered 4xx/5xx (score 0). A `3` means fix the site, not the SEO.

## 2. Read the report

Top-level fields: `url`, `score` (0-100), `pagesAudited`, `framework` (what RankCLI detected,
e.g. `nextjs`, `astro`, `wordpress`), `healthScores` (`overall`, `crawlability`, `onPage`,
`content`, `performance`, `security`, `aiReadiness`, ...), `issues[]`, `exitCode`.

Each issue has `code`, `severity` (`error` | `warning` | `notice`), `category`, `title`,
`description`, `howToFix`, and `affectedUrls[]`. Group by `code`; one code can affect many pages.

```bash
jq '[.issues[] | select(.severity=="error")] | group_by(.code) | map({code: .[0].code, title: .[0].title, pages: (map(.affectedUrls[]) | unique | length)})' rankcli-report.json
```

## 3. Triage in this order

1. **Errors**, always first.
2. **Indexability and crawlability**: a `noindex` on a page that should rank, a canonical pointing
   at another host or at staging, robots.txt blocking what should be crawled, pages answering
   4xx/5xx. These make everything else irrelevant.
3. **On-page**: missing or duplicate titles and descriptions, heading structure, broken links.
4. **Structured data** and Open Graph.
5. **AI readiness**: AI crawlers (GPTBot, ClaudeBot, PerplexityBot) blocked by robots.txt or at the
   CDN edge, no `llms.txt`, content that an AI answer could not quote (no direct answers, no
   self-contained sections).

What not to act on: `notice` items are informational. A `noindex` on `/login`, `/signup`,
`/account` or an app shell is intended and the audit already skips the search-visibility checks
for those pages.

## 4. Fix in the codebase

- Use each issue's `howToFix`. Apply it where the framework actually serves static files:
  `public/` for Vite, Next.js, Nuxt and Astro, `static/` for SvelteKit and Hugo, `wwwroot/` for
  ASP.NET, the theme for WordPress. The `framework` field tells you which.
- Never invent facts for structured data: no made-up addresses, phone numbers, ratings or reviews.
  Ask the user for anything the page does not already state.
- Do not add a `<link rel="canonical">` to a client-rendered app shell that serves every route.
- Prefer one change per issue code, so the re-run shows which fix worked.

RankCLI can also propose its own fixes from inside the project's repository:

```bash
npx -y @rankcli/cli fix --url https://example.com --dry-run          # preview only
npx -y @rankcli/cli fix --url https://example.com --only MISSING_META_DESCRIPTION,NO_SITEMAP
```

## 5. Re-run and compare

Run the same audit command again and compare `score` and the set of issue `code`s. Report the
before and after score and the codes that disappeared. If the score fell, say so; do not hide it.

## Focused checks

- AI search visibility only: `npx -y @rankcli/cli geo --url https://example.com -o json`
- If the `rankcli` MCP server is installed in this host, the tools `seo_analyze`, `seo_geo_check`,
  `seo_robots_ai`, `seo_structured_data`, `seo_core_web_vitals` and `seo_security_headers` run the
  same checks on HTML the host already has, without a network crawl.
