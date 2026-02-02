export function OrganizationSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Hidden Depths',
    alternateName: 'Hidden Depths Digital Sanctuary',
    url: 'https://hidden-depths-web.pages.dev',
    logo: 'https://hidden-depths-web.pages.dev/logo.png',
    description: 'Anonymous mental health support and mentorship platform providing a digital sanctuary for mental clarity',
    foundingDate: '2026',
    founder: {
      '@type': 'Person',
      name: 'Himadryy',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      email: 'support@hiddendepths.com',
      availableLanguage: ['English', 'Hindi'],
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Kolkata',
      addressRegion: 'West Bengal',
      addressCountry: 'IN',
    },
    sameAs: [
      'https://github.com/Himadryy/hidden_depths_web',
      'https://twitter.com/HiddenDepthsIN',
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function ServiceSchema() {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    serviceType: 'Mental Health Mentorship',
    provider: {
      '@type': 'Organization',
      name: 'Hidden Depths',
    },
    areaServed: {
      '@type': 'Country',
      name: 'India',
    },
    audience: {
      '@type': 'Audience',
      audienceType: 'Adults seeking mental health support',
    },
    availableChannel: {
      '@type': 'ServiceChannel',
      serviceUrl: 'https://hidden-depths-web.pages.dev',
      serviceType: 'Online Service',
    },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Mentorship Sessions',
      itemListElement: [
        {
          '@type': 'Offer',
          itemOffered: {
            '@type': 'Service',
            name: '45-Minute Anonymous Mentorship Session',
            description: 'One-on-one anonymous mentorship session with a focus on mental clarity and emotional support',
          },
          price: '99',
          priceCurrency: 'INR',
          availability: 'https://schema.org/InStock',
        },
      ],
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function FAQSchema({ faqs }: { faqs: Array<{ question: string; answer: string }> }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function BreadcrumbSchema({ items }: { items: Array<{ name: string; url: string }> }) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
