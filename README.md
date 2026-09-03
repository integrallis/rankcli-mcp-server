# @rankcli/mcp-server

Free, local SEO + GEO (AI-search-citation) analysis as an MCP tool. No signup, no API key, nothing sent to RankCLI's servers — it runs entirely inside your MCP host (Claude Code, Claude Desktop, Cursor, etc.) against HTML you already have or that your host fetches for you.

```bash
npx @rankcli/mcp-server
```

**Claude Desktop config** (`~/Library/Application Support/Claude/claude_desktop_config.json`):

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

This local server works from HTML/robots.txt you or your MCP host supply. For **URL-only tools that fetch and crawl for you** (`seo_audit`, `seo_geo_check`, `seo_robots_check`, `seo_compare`), plus the newer Cloudflare AI-crawler-gating compliance check, CI/CD scheduling, and auto-fix PRs, see the hosted endpoint and paid tiers:

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
