# @rankcli/mcp-server

Free, local SEO + GEO (AI-search-citation) analysis as an MCP tool. No signup, no API key, nothing sent to RankCLI's servers — it runs entirely inside your MCP host (Claude Code, Claude Desktop, Cursor, etc.) against HTML you already have or that your host fetches for you.

## Install

[![Add to Cursor](https://img.shields.io/badge/Add%20to-Cursor-000000?style=for-the-badge&logo=cursor&logoColor=white)](cursor://anysphere.cursor-deeplink/mcp/install?name=rankcli&config=eyJjb21tYW5kIjoibnB4IiwiYXJncyI6WyIteSIsIkByYW5rY2xpL21jcC1zZXJ2ZXIiXX0=)
[![Add to VS Code](https://img.shields.io/badge/Add%20to-VS%20Code-007ACC?style=for-the-badge&logo=visualstudiocode&logoColor=white)](vscode:mcp/install?%7B%22name%22%3A%22rankcli%22%2C%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22%40rankcli%2Fmcp-server%22%5D%7D)

**Claude Desktop** — download the latest `.mcpb` from
[Releases](https://github.com/integrallis/rankcli/releases/latest) and double-click it.
No config file, no terminal.

**Claude Code** — one line, no config file:

```bash
claude mcp add rankcli -- npx -y @rankcli/mcp-server
```

**Anything else** (Claude Desktop, Codex, Windsurf) — the standard config block:

```json
{
  "mcpServers": {
    "rankcli": {
      "command": "npx",
      "args": ["-y", "@rankcli/mcp-server"]
    }
  }
}
```

**Claude Desktop config path** (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "rankcli": {
      "command": "npx",
      "args": ["@rankcli/mcp-server"]
    }
  }
}
```

## Agent skills and Claude Code plugin

The same checks as skills your coding agent loads on demand, named for the job you type:

| Skill | For |
|---|---|
| `check-site-before-deploy` | the audit as a deploy gate: build directory or preview URL, a committed baseline, GitHub Actions or any CI |
| `fix-seo-regressions` | what changed, against a baseline or a previous report, fixed in the codebase by code |
| `is-my-site-blocked-from-ai-search` | whether ChatGPT, Claude, Perplexity and Google can read the site, by bot class, and the fix in robots.txt, at the CDN or in the framework |
| `seo-audit` | the full audit, read and triaged |
| `seo-ci-gate` | the short form of the deploy gate |

**Any agent** (Claude Code, Cursor, Codex, Copilot, Windsurf and others), via the
[skills CLI](https://skills.sh):

```bash
npx skills add integrallis/rankcli-mcp-server
```

**Claude Code plugin** (the two skills plus the MCP server, one install):

```
/plugin install rankcli --marketplace integrallis/rankcli-mcp-server
```

or from a shell: `claude plugin marketplace add integrallis/rankcli-mcp-server` then
`claude plugin install rankcli@rankcli`. The skills are then `/rankcli:check-site-before-deploy`,
`/rankcli:fix-seo-regressions`, `/rankcli:is-my-site-blocked-from-ai-search`, `/rankcli:seo-audit`
and `/rankcli:seo-ci-gate`.

The server's source is `packages/mcp-server` in [integrallis/rankcli](https://github.com/integrallis/rankcli)
(FSL-1.1-MIT); this repository is the install page, the skills and the plugin.

## Available Tools

| Tool | Description |
|------|-------------|
| `seo_analyze` | Full SEO analysis: GEO, Core Web Vitals, structured data, security headers, mobile, images, internal linking |
| `seo_geo_check` | AI search visibility (GEO) — crawler access, LLM content signals, citation readiness |
| `seo_robots_ai` | Which AI crawlers (GPTBot, ClaudeBot, PerplexityBot, etc.) your robots.txt allows or blocks |
| `seo_generate_robots` | Generate an AI-crawler-friendly robots.txt |
| `seo_core_web_vitals` | Estimate LCP, CLS, INP, TTFB from HTML |
| `seo_structured_data` | Validate JSON-LD / Schema.org markup |
| `seo_generate_schema` | Generate a JSON-LD template for a page type |
| `seo_security_headers` | Grade HTTPS, HSTS, CSP, and related headers |
| `seo_generate_security_headers` | Generate recommended security header config |
| `seo_images` | Alt text, dimensions, formats, lazy loading |
| `seo_internal_links` | Anchor text quality, orphan-page risk |
| `seo_mobile` | Viewport, touch targets, PWA readiness |
| `seo_ai_crawlers` | Reference list of known AI crawler user agents |

## Example

Just ask Claude:

> "Run an SEO audit on https://example.com"

Your MCP host fetches the page and Claude calls these tools directly — nothing round-trips through RankCLI.

## Want more?

This local server works from HTML/robots.txt you or your MCP host supply. The free hosted
endpoint `https://mcp.rankcli.dev/mcp/free` serves the same thirteen analysis tools with no
key, for hosts that cannot run npx. For **URL-only tools that fetch and crawl for you** (`seo_audit`, `seo_geo_check`, `seo_robots_check`, `seo_compare`), plus the newer Cloudflare AI-crawler-gating compliance check, CI/CD scheduling, and auto-fix PRs, see the hosted endpoint and paid tiers:

```json
{
  "mcpServers": {
    "rankcli-hosted": {
      "url": "https://rankcli-audit-worker.fly.dev/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_API_KEY"
      }
    }
  }
}
```

Get a free API key at [rankcli.dev/dashboard](https://rankcli.dev/dashboard).

## Links

- **Main package**: [@rankcli/cli](https://www.npmjs.com/package/@rankcli/cli)
- **Docs**: [rankcli.dev/docs](https://rankcli.dev/docs)
- **Dashboard**: [rankcli.dev/dashboard](https://rankcli.dev/dashboard)
