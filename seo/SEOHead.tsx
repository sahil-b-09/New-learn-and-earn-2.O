
import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
}

const SEOHead: React.FC<SEOHeadProps> = ({
  title = "Learn & Earn - Master Skills, Earn Money",
  description = "Learn high-demand skills through our affordable PDF courses and earn 50% commission by referring friends. Start your learning journey today!",
  keywords = "online learning, PDF courses, referral program, earn money, skill development, AI tools, stock market, education",
  image = "/assets/learnandearn-logo.png",
  url = "https://learn-and-earn.in",
  type = "website"
}) => {
  const fullTitle = title.includes("Learn & Earn") ? title : `${title} | Learn & Earn`;
  const fullUrl = url.startsWith('http') ? url : `https://learn-and-earn.in${url}`;
  const fullImage = image.startsWith('http') ? image : `https://learn-and-earn.in${image}`;

  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <meta name="author" content="Learn & Earn" />
      <meta name="robots" content="index, follow" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <link rel="canonical" href={fullUrl} />

      {/* Open Graph Tags */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content="Learn & Earn" />
      <meta property="og:locale" content="en_IN" />

      {/* Twitter Card Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />
      <meta name="twitter:site" content="@learnandearn_in" />

      {/* Additional Meta Tags */}
      <meta name="theme-color" content="#00C853" />
      <meta name="msapplication-TileColor" content="#00C853" />
      
      {/* Structured Data */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "EducationalOrganization",
          "name": "Learn & Earn",
          "description": description,
          "url": fullUrl,
          "logo": fullImage,
          "sameAs": [
            "https://t.me/learnandearn_in",
            "https://wa.me/learnandearn"
          ]
        })}
      </script>
    </Helmet>
  );
};

export default SEOHead;
