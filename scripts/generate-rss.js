const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const SITE_URL = 'https://hidden-depths-web.pages.dev';
const CONTENT_DIR = path.join(process.cwd(), 'content/blog');
const OUTPUT_PATH = path.join(process.cwd(), 'public/feed.xml');

function getAllPosts() {
  if (!fs.existsSync(CONTENT_DIR)) {
    return [];
  }

  const slugs = fs.readdirSync(CONTENT_DIR);
  
  const posts = slugs
    .filter((slug) => {
      const postPath = path.join(CONTENT_DIR, slug);
      return fs.statSync(postPath).isDirectory();
    })
    .map((slug) => {
      const filePath = path.join(CONTENT_DIR, slug, 'index.mdx');
      
      if (!fs.existsSync(filePath)) {
        return null;
      }
      
      const fileContents = fs.readFileSync(filePath, 'utf8');
      const { data } = matter(fileContents);

      return {
        slug,
        title: data.title || '',
        date: data.date || '',
        excerpt: data.excerpt || '',
        category: data.category || '',
      };
    })
    .filter((post) => post !== null);

  return posts.sort((a, b) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });
}

function generateRSS() {
  const posts = getAllPosts();
  
  const rssItems = posts.map((post) => {
    const pubDate = new Date(post.date).toUTCString();
    const link = `${SITE_URL}/blog/${post.slug}`;
    
    return `
    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description><![CDATA[${post.excerpt}]]></description>
      <pubDate>${pubDate}</pubDate>
      <category>${post.category}</category>
    </item>`;
  }).join('');

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>Hidden Depths - The Sanctuary Journal</title>
    <link>${SITE_URL}/blog</link>
    <description>Insights, reflections, and guidance on navigating the complexities of the modern mind. Mental health articles from Hidden Depths.</description>
    <language>en-IN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${SITE_URL}/og-image.png</url>
      <title>Hidden Depths</title>
      <link>${SITE_URL}</link>
    </image>
    ${rssItems}
  </channel>
</rss>`;

  fs.writeFileSync(OUTPUT_PATH, rss);
  console.log('✓ RSS feed generated at public/feed.xml');
}

generateRSS();
