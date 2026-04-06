# SEO & Search Engine Submission Guide

This document outlines how to submit Hidden Depths to search engines and AI platforms for maximum discoverability.

## 🔍 Search Engine Submissions

### Google Search Console

1. **Go to:** https://search.google.com/search-console
2. **Add Property:** `https://hidden-depths-web.pages.dev`
3. **Verify via:** DNS TXT record (recommended) or HTML file
4. **Submit Sitemap:** 
   - URL: `https://hidden-depths-web.pages.dev/sitemap.xml`
   - Go to Sitemaps → Add new sitemap → Enter `sitemap.xml`
5. **Request Indexing:** 
   - Use URL Inspection tool for priority pages
   - Submit: `/`, `/booking`, `/faq`, `/blog`

### Bing Webmaster Tools

1. **Go to:** https://www.bing.com/webmasters
2. **Add Site:** `https://hidden-depths-web.pages.dev`
3. **Verify via:** Import from Google Search Console (easiest)
4. **Submit Sitemap:** Same URL as Google
5. **Enable IndexNow:** Already configured! Key file at `/0ed7e877601f43194024cf5d8420cf02.txt`

### Yandex Webmaster

1. **Go to:** https://webmaster.yandex.com
2. **Add Site:** `https://hidden-depths-web.pages.dev`
3. **Submit Sitemap:** Same URL
4. **IndexNow:** Automatically receives pings from Bing

### DuckDuckGo

DuckDuckGo uses Bing's index, so Bing submission covers it.

---

## 🤖 AI/LLM Platform Submissions

### ChatGPT/OpenAI

- **Automatic:** GPTBot is allowed in robots.txt
- **Files:** `/llms.txt` and `/llms-full.txt` provide context
- **No manual submission needed**

### Claude/Anthropic

- **Automatic:** ClaudeBot and anthropic-ai allowed in robots.txt
- **Files:** Same llms.txt files provide context
- **No manual submission needed**

### Perplexity

- **Automatic:** PerplexityBot allowed in robots.txt
- **Submit for indexing:** https://www.perplexity.ai/submit (when available)

### Google AI (Bard/Gemini)

- **Automatic:** Google-Extended allowed in robots.txt
- **Coverage:** Via Google Search Console indexing

---

## 📁 Files Created for SEO

| File | Purpose | Location |
|------|---------|----------|
| `sitemap.xml` | All indexable URLs | `/sitemap.xml` |
| `robots.txt` | Crawler instructions | `/robots.txt` |
| `llms.txt` | AI/LLM context (summary) | `/llms.txt` |
| `llms-full.txt` | AI/LLM context (detailed) | `/llms-full.txt` |
| `humans.txt` | Site credits | `/humans.txt` |
| `security.txt` | Security contact | `/.well-known/security.txt` |
| IndexNow key | Instant Bing indexing | `/0ed7e877601f43194024cf5d8420cf02.txt` |

---

## 📊 JSON-LD Structured Data

The following schemas are embedded in every page:

1. **Organization** - Brand info, contact, social links
2. **Service** - Mental health mentorship service details
3. **LocalBusiness** - Local SEO for Kolkata/West Bengal
4. **WebSite** - Site-wide search action

Page-specific schemas:
- **FAQ Page** - FAQPage schema on `/faq`
- **Blog Posts** - BlogPosting schema on each article
- **Breadcrumbs** - BreadcrumbList on all inner pages

---

## 🚀 IndexNow Usage

For instant indexing when publishing new content:

```typescript
import { submitToIndexNow } from '@/lib/indexnow';

// After publishing a new blog post
await submitToIndexNow(['/blog/new-post-slug']);

// After updating multiple pages
await submitToIndexNow(['/about', '/faq', '/booking']);
```

---

## ✅ Checklist

- [ ] Submit to Google Search Console
- [ ] Submit to Bing Webmaster Tools
- [ ] Verify IndexNow key is accessible
- [ ] Test sitemap.xml in browser
- [ ] Test robots.txt in browser
- [ ] Validate JSON-LD at https://validator.schema.org
- [ ] Check llms.txt is accessible

---

## 📈 Monitoring

- **Google Search Console:** Monitor impressions, clicks, indexing issues
- **Bing Webmaster Tools:** Check IndexNow submission history
- **Sentry:** Track JS errors that might affect crawling
- **Lighthouse:** Run SEO audit regularly
