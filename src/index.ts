#!/usr/bin/env node
/**
 * RankCLI MCP Server
 * 
 * Model Context Protocol server for AI assistants to perform SEO analysis.
 * Exposes RankCLI's full analysis capabilities to Claude, GPT, and other AI tools.
 * 
 * Usage:
 *   npx @rankcli/mcp-server
 * 
 * Configuration in Claude Desktop:
 *   {
 *     "mcpServers": {
 *       "rankcli": {
 *         "command": "npx",
 *         "args": ["@rankcli/mcp-server"]
 *       }
 *     }
 *   }
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

// Import analyzers from the main package namespace
import { analyzers } from '@rankcli/agent-runtime';

// Tool definitions
const TOOLS: Tool[] = [
  {
    name: 'seo_analyze',
    description: `Run comprehensive SEO analysis on a webpage. Returns scores and issues for:
- GEO (AI Search Optimization) - Is the site visible to ChatGPT, Perplexity, Claude?
- Core Web Vitals (LCP, CLS, INP) - Performance estimates
- Structured Data - Schema.org validation
- Security Headers - HTTPS, HSTS, CSP
- Mobile SEO - Responsive design, touch targets
- Images - Alt text, formats, dimensions
- Internal Linking - Anchor text, orphan detection

Use this for a complete SEO audit.`,
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL of the page to analyze',
        },
        html: {
          type: 'string',
          description: 'HTML content of the page (optional if URL is provided)',
        },
        robotsTxt: {
          type: 'string',
          description: 'robots.txt content for AI crawler analysis (optional)',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'seo_geo_check',
    description: `Check if a website is optimized for AI search engines (GEO - Generative Engine Optimization).

Analyzes:
- AI crawler access (GPTBot, ClaudeBot, PerplexityBot, etc.)
- robots.txt rules for AI crawlers
- JS rendering requirements (can AI crawlers see content?)
- Content structure for LLM consumption
- Citation readiness (trust signals)
- FAQ/entity extraction capability

Critical for visibility in ChatGPT, Perplexity, Claude, and Gemini responses.`,
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL of the page to analyze',
        },
        html: {
          type: 'string',
          description: 'HTML content of the page',
        },
        robotsTxt: {
          type: 'string',
          description: 'robots.txt content',
        },
      },
      required: ['url'],
    },
  },
  {
    name: 'seo_robots_ai',
    description: `Analyze robots.txt for AI crawler permissions. Shows which AI crawlers (GPTBot, ClaudeBot, PerplexityBot, etc.) are allowed or blocked.`,
    inputSchema: {
      type: 'object',
      properties: {
        robotsTxt: {
          type: 'string',
          description: 'Content of robots.txt file',
        },
      },
      required: ['robotsTxt'],
    },
  },
  {
    name: 'seo_generate_robots',
    description: `Generate an AI-friendly robots.txt that allows all major AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, etc.)`,
    inputSchema: {
      type: 'object',
      properties: {
        siteUrl: {
          type: 'string',
          description: 'Base URL of the site (e.g., https://example.com)',
        },
      },
      required: ['siteUrl'],
    },
  },
  {
    name: 'seo_core_web_vitals',
    description: `Estimate Core Web Vitals (LCP, CLS, INP, TTFB) from HTML analysis. Identifies issues like:
- Render-blocking resources
- Images without dimensions
- Large JavaScript bundles
- Missing preload hints`,
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL of the page',
        },
        html: {
          type: 'string',
          description: 'HTML content of the page',
        },
      },
      required: ['url', 'html'],
    },
  },
  {
    name: 'seo_structured_data',
    description: `Validate JSON-LD structured data (Schema.org). Checks for:
- Required properties per schema type
- Article, Product, FAQ, HowTo, LocalBusiness schemas
- Rich result eligibility
- Common mistakes`,
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL of the page',
        },
        html: {
          type: 'string',
          description: 'HTML content with JSON-LD',
        },
      },
      required: ['url', 'html'],
    },
  },
  {
    name: 'seo_generate_schema',
    description: `Generate JSON-LD structured data template for a page type (article, product, faq, local-business, website).`,
    inputSchema: {
      type: 'object',
      properties: {
        pageType: {
          type: 'string',
          enum: ['article', 'product', 'faq', 'local-business', 'website'],
          description: 'Type of page',
        },
        siteName: {
          type: 'string',
          description: 'Name of the website',
        },
        siteUrl: {
          type: 'string',
          description: 'Base URL of the website',
        },
        authorName: {
          type: 'string',
          description: 'Default author name (for articles)',
        },
        organizationName: {
          type: 'string',
          description: 'Organization name',
        },
      },
      required: ['pageType', 'siteName', 'siteUrl'],
    },
  },
  {
    name: 'seo_security_headers',
    description: `Analyze security headers (HTTPS, HSTS, CSP, X-Frame-Options, etc.). Returns a security grade A+ through F.`,
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL of the page',
        },
        headers: {
          type: 'object',
          description: 'HTTP response headers',
          additionalProperties: { type: 'string' },
        },
      },
      required: ['url', 'headers'],
    },
  },
  {
    name: 'seo_generate_security_headers',
    description: `Generate recommended security headers configuration for a site.`,
    inputSchema: {
      type: 'object',
      properties: {
        siteUrl: {
          type: 'string',
          description: 'Base URL of the site',
        },
      },
      required: ['siteUrl'],
    },
  },
  {
    name: 'seo_images',
    description: `Analyze images for SEO and performance. Checks alt text, dimensions, formats (WebP/AVIF), lazy loading, and responsive images.`,
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL of the page',
        },
        html: {
          type: 'string',
          description: 'HTML content of the page',
        },
      },
      required: ['url', 'html'],
    },
  },
  {
    name: 'seo_internal_links',
    description: `Analyze internal linking structure. Checks anchor text quality, orphan page risk, link distribution, and suggests linking opportunities.`,
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL of the page',
        },
        html: {
          type: 'string',
          description: 'HTML content of the page',
        },
      },
      required: ['url', 'html'],
    },
  },
  {
    name: 'seo_mobile',
    description: `Analyze mobile SEO. Checks viewport, touch targets, font sizes, content width, PWA readiness.`,
    inputSchema: {
      type: 'object',
      properties: {
        url: {
          type: 'string',
          description: 'URL of the page',
        },
        html: {
          type: 'string',
          description: 'HTML content of the page',
        },
      },
      required: ['url', 'html'],
    },
  },
  {
    name: 'seo_ai_crawlers',
    description: `Get information about all known AI crawlers (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, etc.) including their user agents and purposes.`,
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

// Create server
const server = new Server(
  {
    name: 'rankcli',
    version: '0.0.1',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List tools handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: TOOLS };
});

// Call tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    switch (name) {
      case 'seo_analyze': {
        const { url, html, robotsTxt } = args as { url: string; html?: string; robotsTxt?: string };
        
        if (!html) {
          return {
            content: [
              {
                type: 'text',
                text: 'HTML content is required for analysis. Please provide the HTML of the page.',
              },
            ],
          };
        }
        
        const result = await analyzers.analyzeComprehensive(html, url, { robotsTxt });
        return {
          content: [
            {
              type: 'text',
              text: formatComprehensiveResult(result),
            },
          ],
        };
      }
      
      case 'seo_geo_check': {
        const { url, html, robotsTxt } = args as { url: string; html?: string; robotsTxt?: string };
        
        if (!html) {
          return {
            content: [{ type: 'text', text: 'HTML content required for GEO analysis.' }],
          };
        }
        
        const result = await analyzers.analyzeGEO(html, url, robotsTxt);
        return {
          content: [{ type: 'text', text: formatGEOResult(result) }],
        };
      }
      
      case 'seo_robots_ai': {
        const { robotsTxt } = args as { robotsTxt: string };
        const result = analyzers.analyzeRobotsTxtForAI(robotsTxt);
        return {
          content: [
            {
              type: 'text',
              text: `## AI Crawler Analysis\n\n**Allowed:** ${result.allowed.join(', ') || 'None'}\n\n**Blocked:** ${result.blocked.join(', ') || 'None'}\n\n**Recommendations:**\n${result.recommendations.map(r => `- ${r}`).join('\n') || '- All good!'}`,
            },
          ],
        };
      }
      
      case 'seo_generate_robots': {
        const { siteUrl } = args as { siteUrl: string };
        const robotsTxt = analyzers.generateAIFriendlyRobotsTxt(siteUrl);
        return {
          content: [
            {
              type: 'text',
              text: `## AI-Friendly robots.txt\n\n\`\`\`\n${robotsTxt}\`\`\``,
            },
          ],
        };
      }
      
      case 'seo_core_web_vitals': {
        const { url, html } = args as { url: string; html: string };
        const result = analyzers.analyzeCoreWebVitals(html, url);
        return {
          content: [{ type: 'text', text: formatCWVResult(result) }],
        };
      }
      
      case 'seo_structured_data': {
        const { url, html } = args as { url: string; html: string };
        const result = analyzers.analyzeStructuredData(html, url);
        return {
          content: [{ type: 'text', text: formatStructuredDataResult(result) }],
        };
      }
      
      case 'seo_generate_schema': {
        const { pageType, siteName, siteUrl, authorName, organizationName } = args as {
          pageType: 'article' | 'product' | 'faq' | 'local-business' | 'website';
          siteName: string;
          siteUrl: string;
          authorName?: string;
          organizationName?: string;
        };
        const schema = analyzers.generateSchemaTemplate(pageType, { siteName, siteUrl, authorName, organizationName });
        return {
          content: [
            {
              type: 'text',
              text: `## ${pageType} Schema Template\n\n\`\`\`json\n${schema}\n\`\`\`\n\nReplace {{placeholders}} with actual values.`,
            },
          ],
        };
      }
      
      case 'seo_security_headers': {
        const { url, headers } = args as { url: string; headers: Record<string, string> };
        const result = analyzers.analyzeSecurityHeaders(headers, url);
        return {
          content: [{ type: 'text', text: formatSecurityResult(result) }],
        };
      }
      
      case 'seo_generate_security_headers': {
        const { siteUrl } = args as { siteUrl: string };
        const headers = analyzers.generateSecurityHeaders(siteUrl);
        return {
          content: [
            {
              type: 'text',
              text: `## Recommended Security Headers\n\n${Object.entries(headers).map(([k, v]) => `**${k}:**\n\`${v}\``).join('\n\n')}`,
            },
          ],
        };
      }
      
      case 'seo_images': {
        const { url, html } = args as { url: string; html: string };
        const result = analyzers.analyzeImages(html, url);
        return {
          content: [{ type: 'text', text: formatImagesResult(result) }],
        };
      }
      
      case 'seo_internal_links': {
        const { url, html } = args as { url: string; html: string };
        const result = analyzers.analyzeInternalLinking(html, url);
        return {
          content: [{ type: 'text', text: formatInternalLinksResult(result) }],
        };
      }
      
      case 'seo_mobile': {
        const { url, html } = args as { url: string; html: string };
        const result = analyzers.analyzeMobileSEO(html, url);
        return {
          content: [{ type: 'text', text: formatMobileResult(result) }],
        };
      }
      
      case 'seo_ai_crawlers': {
        return {
          content: [
            {
              type: 'text',
              text: formatAICrawlersInfo(),
            },
          ],
        };
      }
      
      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// Formatting helpers
function formatComprehensiveResult(result: Awaited<ReturnType<typeof analyzers.analyzeComprehensive>>): string {
  const criticalIssues = result.allIssues.filter(i => i.severity === 'critical');
  const warnings = result.allIssues.filter(i => i.severity === 'warning');
  
  return `# SEO Analysis Report

**URL:** ${result.url}
**Overall Score:** ${result.overallScore}/100
**Analyzed:** ${result.timestamp}

## Scores

| Category | Score |
|----------|-------|
| GEO (AI Search) | ${result.grades.geo}/100 |
| Core Web Vitals | ${result.grades.coreWebVitals}/100 |
| Security | ${result.grades.security} |
| Structured Data | ${result.grades.structuredData}/100 |
| Images | ${result.grades.images}/100 |
| Internal Links | ${result.grades.internalLinking}/100 |
| Mobile SEO | ${result.grades.mobile}/100 |

## Critical Issues (${criticalIssues.length})

${criticalIssues.map(i => `### ❌ ${i.title}\n${i.description}\n\n**Fix:** ${i.howToFix}`).join('\n\n') || 'None!'}

## Warnings (${warnings.length})

${warnings.slice(0, 5).map(i => `- **${i.title}:** ${i.description}`).join('\n') || 'None!'}

## Priority Recommendations

${result.prioritizedRecommendations.map((r, i) => `${i + 1}. ${r}`).join('\n')}
`;
}

function formatGEOResult(result: Awaited<ReturnType<typeof analyzers.analyzeGEO>>): string {
  return `# GEO Analysis (AI Search Optimization)

**Score:** ${result.score}/100

## AI Crawler Access

| Status | Crawlers |
|--------|----------|
| ✅ Allowed | ${result.aiCrawlerAccess.allowedCrawlers.join(', ') || 'None'} |
| ❌ Blocked | ${result.aiCrawlerAccess.blockedCrawlers.join(', ') || 'None'} |

**Server-Side Rendered:** ${result.aiCrawlerAccess.serverSideRendered ? '✅ Yes' : '❌ No'}
**JS Rendering Required:** ${result.aiCrawlerAccess.jsRenderingRequired ? '⚠️ Yes (AI crawlers may not see content)' : '✅ No'}

## LLM Friendliness Scores

| Signal | Score |
|--------|-------|
| Content Clarity | ${result.llmSignals.contentClarity}/100 |
| Fact Density | ${result.llmSignals.factDensity}/100 |
| Structure Quality | ${result.llmSignals.structureQuality}/100 |
| Citation Quality | ${result.llmSignals.citationQuality}/100 |

## Content Structure

- Structured Data: ${result.contentStructure.hasStructuredData ? '✅' : '❌'}
- FAQ Schema: ${result.contentStructure.hasFAQSchema ? '✅' : '❌'}
- Article Schema: ${result.contentStructure.hasArticleSchema ? '✅' : '❌'}
- Heading Hierarchy: ${result.contentStructure.headingHierarchy}

## Citation Readiness

Trust Signals: ${result.citationReadiness.trustSignals.join(', ') || 'None detected'}

## Recommendations

${result.recommendations.map(r => `- ${r}`).join('\n')}
`;
}

function formatCWVResult(result: ReturnType<typeof analyzers.analyzeCoreWebVitals>): string {
  const emoji = (est: string) => est === 'good' ? '🟢' : est === 'needs-improvement' ? '🟡' : '🔴';
  
  return `# Core Web Vitals Estimate

**Overall Score:** ${result.overallScore}/100

| Metric | Estimate | Issues |
|--------|----------|--------|
| LCP (Largest Contentful Paint) | ${emoji(result.lcp.estimate)} ${result.lcp.estimate} | ${result.lcp.issues.length} |
| CLS (Cumulative Layout Shift) | ${emoji(result.cls.estimate)} ${result.cls.estimate} | ${result.cls.issues.length} |
| INP (Interaction to Next Paint) | ${emoji(result.inp.estimate)} ${result.inp.estimate} | ${result.inp.issues.length} |
| TTFB (Time to First Byte) | ${emoji(result.ttfb.estimate)} ${result.ttfb.estimate} | ${result.ttfb.issues.length} |

## Issues

${result.issues.map(i => `- **${i.title}:** ${i.howToFix}`).join('\n') || 'No critical issues!'}
`;
}

function formatStructuredDataResult(result: ReturnType<typeof analyzers.analyzeStructuredData>): string {
  return `# Structured Data Analysis

**Score:** ${result.score}/100
**Schemas Found:** ${result.schemas.length}

## Schema Types

| Type | Valid | Errors |
|------|-------|--------|
${result.schemas.map(s => `| ${s.type} | ${s.isValid ? '✅' : '❌'} | ${s.errors.join('; ') || '-'} |`).join('\n') || '| None found | - | - |'}

## Rich Result Eligibility

- Organization: ${result.hasOrganization ? '✅' : '❌'}
- WebSite: ${result.hasWebSite ? '✅' : '❌'}
- Breadcrumb: ${result.hasBreadcrumb ? '✅' : '❌'}
- Article: ${result.hasArticle ? '✅' : '❌'}
- Product: ${result.hasProduct ? '✅' : '❌'}
- FAQ: ${result.hasFAQ ? '✅' : '❌'}
- HowTo: ${result.hasHowTo ? '✅' : '❌'}

## Recommendations

${result.recommendations.map(r => `- ${r}`).join('\n')}
`;
}

function formatSecurityResult(result: ReturnType<typeof analyzers.analyzeSecurityHeaders>): string {
  return `# Security Headers Analysis

**Grade:** ${result.grade}
**Score:** ${result.score}/100

## Headers

| Header | Status |
|--------|--------|
| HTTPS | ${result.https.enabled ? '✅' : '❌'} |
| HSTS | ${result.https.hasHSTS ? '✅' : '❌'} |
| CSP | ${result.contentSecurity.hasCSP ? '✅' : '❌'} |
| X-Frame-Options | ${result.frameOptions.hasXFrameOptions ? '✅' : '❌'} |
| X-Content-Type-Options | ${result.contentTypeOptions.hasXContentTypeOptions ? '✅' : '❌'} |
| Referrer-Policy | ${result.referrerPolicy.hasReferrerPolicy ? '✅' : '❌'} |
| Permissions-Policy | ${result.permissionsPolicy.hasPermissionsPolicy ? '✅' : '❌'} |

## Issues

${result.issues.map(i => `- **${i.title}:** ${i.howToFix}`).join('\n') || 'No issues!'}
`;
}

function formatImagesResult(result: ReturnType<typeof analyzers.analyzeImages>): string {
  return `# Image Analysis

**Score:** ${result.score}/100
**Total Images:** ${result.totalImages}

## Stats

| Metric | Count |
|--------|-------|
| With Alt Text | ${result.imagesWithAlt} |
| With Dimensions | ${result.imagesWithDimensions} |
| Lazy Loading | ${result.imagesWithLazyLoading} |
| Modern Formats | ${result.modernFormats} |
| Legacy Formats | ${result.legacyFormats} |

## Issues

${result.issues.map(i => `- **${i.title}:** ${i.howToFix}`).join('\n') || 'No issues!'}

## Recommendations

${result.recommendations.map(r => `- ${r}`).join('\n')}
`;
}

function formatInternalLinksResult(result: ReturnType<typeof analyzers.analyzeInternalLinking>): string {
  return `# Internal Linking Analysis

**Score:** ${result.score}/100

## Stats

| Metric | Count |
|--------|-------|
| Total Links | ${result.totalLinks} |
| Internal Links | ${result.internalLinks} |
| External Links | ${result.externalLinks} |
| Navigation Links | ${result.navigationLinks} |
| Content Links | ${result.contentLinks} |
| Unique Internal Targets | ${result.uniqueInternalTargets} |

## Anchor Text Quality

- Descriptive: ${result.anchorTextAnalysis.descriptive}
- Generic: ${result.anchorTextAnalysis.generic}
- Empty: ${result.anchorTextAnalysis.empty}

## Issues

${result.issues.map(i => `- **${i.title}:** ${i.howToFix}`).join('\n') || 'No issues!'}

## Recommendations

${result.recommendations.map(r => `- ${r}`).join('\n')}
`;
}

function formatMobileResult(result: ReturnType<typeof analyzers.analyzeMobileSEO>): string {
  return `# Mobile SEO Analysis

**Score:** ${result.score}/100

## Viewport

- Has Viewport: ${result.viewport.hasViewport ? '✅' : '❌'}
- Responsive: ${result.viewport.isResponsive ? '✅' : '❌'}
${result.viewport.viewportContent ? `- Content: \`${result.viewport.viewportContent}\`` : ''}

## Touch Targets

- Small Targets: ${result.touchTargets.smallTargets}
- Proper Targets: ${result.touchTargets.properTargets}

## Mobile Features

- Apple Touch Icon: ${result.mobileSpecific.hasAppleTouchIcon ? '✅' : '❌'}
- Theme Color: ${result.mobileSpecific.hasThemeColor ? '✅' : '❌'}
- Web App Manifest: ${result.mobileSpecific.hasManifest ? '✅' : '❌'}
- Responsive Images: ${result.mobileSpecific.hasMobileOptimizedImages ? '✅' : '❌'}

## Issues

${result.issues.map(i => `- **${i.title}:** ${i.howToFix}`).join('\n') || 'No issues!'}

## Recommendations

${result.recommendations.map(r => `- ${r}`).join('\n')}
`;
}

function formatAICrawlersInfo(): string {
  const crawlers = Object.entries(analyzers.AI_CRAWLERS_INFO);
  return `# Known AI Crawlers

${crawlers.map(([name, info]) => `## ${name}
- **User-Agent:** ${info.userAgent}
- **Company:** ${info.company}
- **Purpose:** ${info.purpose}
`).join('\n')}

## robots.txt Example

\`\`\`
User-agent: GPTBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: PerplexityBot
Allow: /
\`\`\`
`;
}

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('RankCLI MCP Server running on stdio');
}

main().catch(console.error);
