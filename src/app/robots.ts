import { MetadataRoute } from 'next';

export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/admin/',
          '/private/',
          '/_next/',
          '/static/',
          '/profile',
          '/payment-success',
          '/session', // Video session rooms are private
        ],
      },
      // Explicitly allow AI/LLM bots for better discoverability
      {
        userAgent: 'GPTBot',
        allow: ['/', '/llms.txt', '/llms-full.txt'],
      },
      {
        userAgent: 'ChatGPT-User',
        allow: ['/', '/llms.txt', '/llms-full.txt'],
      },
      {
        userAgent: 'Google-Extended',
        allow: ['/', '/llms.txt', '/llms-full.txt'],
      },
      {
        userAgent: 'anthropic-ai',
        allow: ['/', '/llms.txt', '/llms-full.txt'],
      },
      {
        userAgent: 'ClaudeBot',
        allow: ['/', '/llms.txt', '/llms-full.txt'],
      },
      {
        userAgent: 'Claude-Web',
        allow: ['/', '/llms.txt', '/llms-full.txt'],
      },
      {
        userAgent: 'PerplexityBot',
        allow: ['/', '/llms.txt', '/llms-full.txt'],
      },
      {
        userAgent: 'Bytespider', // TikTok/ByteDance AI
        allow: ['/', '/llms.txt', '/llms-full.txt'],
      },
      {
        userAgent: 'CCBot', // Common Crawl for AI training
        allow: ['/', '/llms.txt', '/llms-full.txt'],
      },
      {
        userAgent: 'cohere-ai',
        allow: ['/', '/llms.txt', '/llms-full.txt'],
      },
    ],
    sitemap: 'https://hidden-depths-web.pages.dev/sitemap.xml',
    host: 'https://hidden-depths-web.pages.dev',
  };
}
