import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

// Custom Heading Components
const H1 = ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h1 
    className="text-3xl md:text-4xl font-serif font-bold text-white mt-12 mb-6 leading-tight"
    {...props}
  >
    {children}
  </h1>
);

const H2 = ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h2 
    className="text-2xl font-serif font-bold text-white mt-10 mb-4 leading-tight"
    {...props}
  >
    {children}
  </h2>
);

const H3 = ({ children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 
    className="text-xl font-serif font-semibold text-white mt-8 mb-3 leading-tight"
    {...props}
  >
    {children}
  </h3>
);

// Custom Link Component
interface CustomLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href?: string;
}

const CustomLink = ({ href, children, ...props }: CustomLinkProps) => {
  const isInternal = href && (href.startsWith('/') || href.startsWith('#'));

  if (isInternal) {
    return (
      <Link 
        href={href} 
        className="text-[var(--accent)] hover:text-[var(--accent)]/80 underline underline-offset-4 transition-colors"
        {...props}
      >
        {children}
      </Link>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-[var(--accent)] hover:text-[var(--accent)]/80 underline underline-offset-4 transition-colors"
      {...props}
    >
      {children}
    </a>
  );
};

// Callout Component
type CalloutVariant = 'info' | 'warning' | 'tip';

interface CalloutProps {
  variant?: CalloutVariant;
  children: React.ReactNode;
}

const variantStyles: Record<CalloutVariant, { border: string; bg: string; icon: string }> = {
  info: {
    border: 'border-blue-500',
    bg: 'bg-blue-500/10',
    icon: 'ℹ️',
  },
  warning: {
    border: 'border-yellow-500',
    bg: 'bg-yellow-500/10',
    icon: '⚠️',
  },
  tip: {
    border: 'border-[var(--accent)]',
    bg: 'bg-[var(--accent)]/10',
    icon: '💡',
  },
};

export const Callout = ({ variant = 'info', children }: CalloutProps) => {
  const styles = variantStyles[variant];
  
  return (
    <div className={`${styles.bg} p-6 border-l-4 ${styles.border} my-8 rounded-r-lg`}>
      <div className="flex gap-3">
        <span className="text-xl flex-shrink-0">{styles.icon}</span>
        <div className="text-white prose prose-invert prose-sm max-w-none">
          {children}
        </div>
      </div>
    </div>
  );
};

// Custom Image Component with lazy loading
interface MDXImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  caption?: string;
}

export const MDXImage = ({ src, alt, width = 800, height = 450, caption }: MDXImageProps) => (
  <figure className="my-8">
    <div className="rounded-xl overflow-hidden border border-white/10">
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        className="w-full h-auto"
      />
    </div>
    {caption && (
      <figcaption className="text-center text-sm text-gray-500 mt-3 italic">
        {caption}
      </figcaption>
    )}
  </figure>
);

// Paragraph component
const Paragraph = ({ children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className="text-gray-300 leading-relaxed mb-6" {...props}>
    {children}
  </p>
);

// Blockquote component
const Blockquote = ({ children, ...props }: React.HTMLAttributes<HTMLQuoteElement>) => (
  <blockquote 
    className="border-l-4 border-[var(--accent)] pl-6 my-8 italic text-white/90"
    {...props}
  >
    {children}
  </blockquote>
);

// List components
const UnorderedList = ({ children, ...props }: React.HTMLAttributes<HTMLUListElement>) => (
  <ul className="list-disc list-inside space-y-2 text-gray-300 mb-6 ml-4" {...props}>
    {children}
  </ul>
);

const OrderedList = ({ children, ...props }: React.HTMLAttributes<HTMLOListElement>) => (
  <ol className="list-decimal list-inside space-y-2 text-gray-300 mb-6 ml-4" {...props}>
    {children}
  </ol>
);

// Horizontal Rule
const HorizontalRule = () => (
  <hr className="border-white/10 my-10" />
);

// Code block
const Code = ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
  <code 
    className="bg-white/10 px-2 py-1 rounded text-sm font-mono text-[var(--accent)]"
    {...props}
  >
    {children}
  </code>
);

const Pre = ({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) => (
  <pre 
    className="bg-white/5 border border-white/10 rounded-xl p-4 overflow-x-auto my-6"
    {...props}
  >
    {children}
  </pre>
);

// Strong and Em
const Strong = ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
  <strong className="font-bold text-white" {...props}>
    {children}
  </strong>
);

const Em = ({ children, ...props }: React.HTMLAttributes<HTMLElement>) => (
  <em className="italic text-white/90" {...props}>
    {children}
  </em>
);

// Export MDX components mapping
export const MDXComponents = {
  h1: H1,
  h2: H2,
  h3: H3,
  a: CustomLink,
  p: Paragraph,
  blockquote: Blockquote,
  ul: UnorderedList,
  ol: OrderedList,
  hr: HorizontalRule,
  code: Code,
  pre: Pre,
  strong: Strong,
  em: Em,
  // Custom components
  Callout,
  MDXImage,
};

export default MDXComponents;
