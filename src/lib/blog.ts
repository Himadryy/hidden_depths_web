import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import readingTime from 'reading-time';

export interface Post {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  content: string;
  readingTime: string;
  tags: string[];
  category: string;
  author: string;
}

export interface PostMeta {
  slug: string;
  title: string;
  date: string;
  excerpt: string;
  readingTime: string;
  tags: string[];
  category: string;
}

const CONTENT_DIR = path.join(process.cwd(), 'content/blog');

export function getAllPosts(): PostMeta[] {
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
      const { data, content } = matter(fileContents);
      const stats = readingTime(content);

      return {
        slug,
        title: data.title || '',
        date: data.date || '',
        excerpt: data.excerpt || '',
        readingTime: stats.text,
        tags: data.tags || [],
        category: data.category || '',
      };
    })
    .filter((post): post is PostMeta => post !== null);

  return posts.sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return dateB.getTime() - dateA.getTime();
  });
}

export function getPostBySlug(slug: string): Post | null {
  const filePath = path.join(CONTENT_DIR, slug, 'index.mdx');
  
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const fileContents = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContents);
  const stats = readingTime(content);

  return {
    slug,
    title: data.title || '',
    date: data.date || '',
    excerpt: data.excerpt || '',
    content,
    readingTime: stats.text,
    tags: data.tags || [],
    category: data.category || '',
    author: data.author || 'Himadryy',
  };
}

export function getAllPostSlugs(): string[] {
  if (!fs.existsSync(CONTENT_DIR)) {
    return [];
  }

  return fs.readdirSync(CONTENT_DIR).filter((slug) => {
    const postPath = path.join(CONTENT_DIR, slug);
    const indexPath = path.join(postPath, 'index.mdx');
    return fs.statSync(postPath).isDirectory() && fs.existsSync(indexPath);
  });
}
