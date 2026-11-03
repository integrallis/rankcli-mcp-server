---
name: is-my-site-blocked-from-ai-search
description: Find out whether ChatGPT, Claude, Perplexity and Google can read a site, by bot class, and fix the block: a robots.txt rule, a CDN or WAF refusing the crawler, a challenge page, metadata served only to Googlebot. Use when asked why a site is not cited by ChatGPT, Perplexity or Claude, whether AI crawlers are blocked, what a Cloudflare AI-bot setting did, or to check robots.txt for AI search.
---

# Is my site blocked from AI search?

Four kinds of bot read a site, and blocking each costs something different. OpenAI documents
GPTBot as training-only and says a site opted out of OAI-SearchBot "will not be shown in
ChatGPT search answers"; Anthropic documents the same split (ClaudeBot, Claude-SearchBot) plus
Claude-User, which fetches one page because a user asked. Most "am I blocked" questions are
answered by that table:

| Class | Bots | Blocking it costs |
|---|---|---|
| search | Googlebot, bingbot | the index that 88 percent of ChatGPT citations come from |
| AI search | OAI-SearchBot, Claude-SearchBot, PerplexityBot | that assistant's search answers |
| user-triggered | ChatGPT-User, Claude-User, Perplexity-User | the assistant reading a page a user pastes |
| training | GPTBot, ClaudeBot, CCBot, Google-Extended | nothing a user sees; a policy choice |

A block can sit in robots.txt, or in front of the origin (a CDN, a WAF, a bot rule, a
challenge page) where robots.txt never sees it. Cloudflare has blocked known AI crawlers on
new zones by default since 2025-07-01, so assume a block until a fetch says otherwise.

## 1. Run the audit on one page

```bash
npx -y @rankcli/cli audit --url https://example.com --max-pages 1 -o json > report.json
jq '[.issues[] | select(.code | test("CRAWLER|BOTS_DISALLOWED|USER_FETCH|AI_BOT_BLOCKED|CLOUDFLARE_AI|METADATA_STREAMED"))] | map({code, severity, title})' report.json
```

RankCLI reads robots.txt and also fetches the page as each bot, so both kinds of block show
up, with the HTTP status the bot received. The codes (CLI 0.0.54 and later):

| Code | Meaning |
|---|---|
| `SEARCH_CRAWLER_BLOCKED_AT_EDGE` (error) | Googlebot or bingbot refused in front of the origin while a browser gets 200 |
| `AI_SEARCH_CRAWLER_BLOCKED_AT_EDGE` (warning) | OAI-SearchBot, Claude-SearchBot or PerplexityBot refused at the edge: out of those answers |
| `AI_USER_FETCH_BLOCKED_AT_EDGE` (warning) | ChatGPT-User, Claude-User or Perplexity-User refused: the assistant cannot read a pasted page |
| `AI_TRAINING_CRAWLER_BLOCKED_AT_EDGE` (notice) | training crawlers refused; no visibility cost |
| `AI_SEARCH_BOTS_DISALLOWED` (warning) | robots.txt disallows the AI search crawlers |
| `AI_USER_FETCH_DISALLOWED` (warning) | robots.txt disallows the user-triggered fetchers |
| `AI_TRAINING_BOTS_DISALLOWED` (notice) | robots.txt disallows the training crawlers; fine if intended |
| `AI_BOT_BLOCKED_ALL` (warning) | robots.txt disallows every AI crawler, search ones included |
| `CLOUDFLARE_AI_CRAWLER_GATE_AMBIGUOUS` (warning) | behind Cloudflare with no explicit AI rules: the default decides |
| `METADATA_STREAMED_FOR_BOTS` (warning) | the title, description and canonical reach Googlebot but not other agents (Next.js streaming metadata) |

Each finding's `details` carries the statuses observed per bot. `rankcli geo --url ...`
prints the robots.txt view alone.

## 2. Confirm by hand when it matters

```bash
for ua in "OAI-SearchBot/1.0" "Claude-SearchBot/1.0" "PerplexityBot/1.0" "ChatGPT-User/1.0" "Googlebot/2.1"; do
  printf '%-22s ' "$ua"; curl -s -o /dev/null -w '%{http_code}\n' -A "Mozilla/5.0 (compatible; $ua)" https://example.com/
done
```

A 403, 401, 429 or 503 for a bot that gets 200 as a browser is an edge block. A 200 whose
body is "Just a moment..." or loads `/cdn-cgi/challenge-platform` is a challenge page, which
a crawler cannot solve. Real crawlers are also verified by IP, so a site may treat the real
Googlebot differently from this test; Search Console's URL Inspection fetches as the real one.

## 3. Fix robots.txt

An `Allow` in a bot's own group wins over a wildcard `Disallow`. Keep the training crawlers
disallowed if that is the policy and allow the rest explicitly:

```
User-agent: OAI-SearchBot
User-agent: Claude-SearchBot
User-agent: PerplexityBot
User-agent: ChatGPT-User
User-agent: Claude-User
User-agent: Perplexity-User
Allow: /
```

Serve robots.txt as `text/plain`; a single-page app that answers every path with its HTML
shell has no robots.txt as far as a crawler is concerned.

## 4. Fix the edge

robots.txt cannot lift an edge block. On Cloudflare, Security > Bots (AI Crawl Control)
lists Search crawlers, Training crawlers and user agents separately: allow the Search class
and the user-triggered agents, keep Training as policy. A "Block AI Bots" toggle or a WAF
custom rule matching `bot` in the user agent catches the search crawlers too; narrow it to
the training tokens. Because Googlebot is classed as mixed-use, a training block on
ad-bearing pages has refused Googlebot as well; allow Search explicitly.

## 5. Fix metadata only Googlebot gets

Next.js app router streams `generateMetadata` for everyone not on its bot list, so the AI
search crawlers read the page without a title or canonical. List them in `htmlLimitedBots`
in `next.config` (OAI-SearchBot, Claude-SearchBot, PerplexityBot, ChatGPT-User, Claude-User)
or make the route's metadata synchronous. Then re-run the audit: `METADATA_STREAMED_FOR_BOTS`
should be gone.

## What does not help

- `llms.txt` is a convention for coding agents and documentation sites; no search or answer
  engine reads it, and publishing one does not unblock anything.
- Adding structured data does not change crawler access.
- Allowing the training crawlers does not put the site in search answers; the search crawlers do.

## 6. Re-check

Run step 1 again and compare the codes. Report what was blocked, by whom (robots.txt or the
edge), what was changed, and what each bot now receives.
