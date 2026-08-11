import type { Locale } from '@/i18n/config';

export type HomeCopy = {
  metadata: {
    title: string;
    description: string;
  };
  heroTitle: string;
  heroDescription: string;
  search: {
    label: string;
    placeholder: string;
    button: string;
    matchingTitle: string;
    ideasTitle: string;
    viewAll: string;
    seeMore: string;
    empty: string;
  };
  spotlightLabels: {
    event: string;
    ride: string;
    idea: string;
  };
  rideNotesTitle: string;
  readMore: string;
  supportPrefix: string;
  supportLink: string;
  supportSuffix: string;
  expertOrganizationPrompt: string;
  expertOrganizationLink: string;
  transparency: {
    eyebrow: string;
    title: string;
    description: string;
    items: Array<{ title: string; body: string }>;
    privacyPrefix: string;
    privacyLink: string;
    privacySuffix: string;
  };
  exploreLabel: string;
  featureActions: Array<{ label: string; href: string }>;
};

export const homeCopy: Record<Locale, HomeCopy> = {
  en: {
    metadata: {
      title: 'Kathmandu MTB Trails, Local Guides & Ride Support',
      description:
        'Find Kathmandu and Nepal MTB trails, local guides, ride support, organizations, campaigns, and bike services in one place.',
    },
    heroTitle: 'Find trails worth riding.',
    heroDescription:
      'Search local routes, connect with guides who know them, and plan your next ride with better context.',
    search: {
      label: 'Search trails',
      placeholder: 'Search Pharping, Chitlang, enduro, Kathmandu...',
      button: 'Search',
      matchingTitle: 'Matching trails',
      ideasTitle: 'Trail ideas',
      viewAll: 'View all',
      seeMore: 'See more trails',
      empty: 'No trails found for this search yet. Try a broader keyword.',
    },
    spotlightLabels: { event: 'Now', ride: 'Guide', idea: 'Idea' },
    rideNotesTitle: 'Ride notes',
    readMore: 'Read more',
    supportPrefix: 'If LocoXperts helps you find better rides, consider',
    supportLink: 'supporting the developer',
    supportSuffix: 'so the platform can stay alive, improve, and remain useful for local riders.',
    expertOrganizationPrompt: 'Verified local guides can upload trails, host rides, and create an organization for campaigns, services, programs, and trail work.',
    expertOrganizationLink: 'Apply as a local guide',
    transparency: {
      eyebrow: 'Platform transparency',
      title: 'What LocoXperts does with your account data',
      description:
        'LocoXperts is a Nepal trail discovery and ride support platform for riders, local guides, organizations, trail services, campaigns, marketplace listings, and ride notes.',
      items: [
        {
          title: 'Why we ask you to sign in',
          body: 'Accounts help riders save context, request trail support, join rides, contact services, report marketplace listings, and manage their own profile.',
        },
        {
          title: 'Google sign-in data',
          body: 'If you continue with Google, we use your basic Google identity, email, and profile information only to create or access your LocoXperts account.',
        },
        {
          title: 'Guide and organization tools',
          body: 'Verified local guides and organizations can manage trails, ride programs, services, campaigns, and marketplace items from their account.',
        },
      ],
      privacyPrefix: 'We do not sell personal data. Read the',
      privacyLink: 'Privacy Policy',
      privacySuffix: 'for collection, usage, sharing, and deletion details.',
    },
    exploreLabel: 'Explore LocoXperts',
    featureActions: [
      { label: 'Find trails', href: '/trails' },
      { label: 'Ride with local guides', href: '/ride-with-experts' },
      { label: 'Ride notes', href: '/ride-notes' },
      { label: 'After the big ride', href: '/ride-notes/what-now-after-the-big-ride' },
      { label: 'Bike shops and support', href: '/store-locator' },
      { label: 'Local services', href: '/services' },
      { label: 'Local organizations', href: '/organizations' },
      { label: 'Trail campaigns', href: '/campaigns' },
      { label: 'Share a trail', href: '/upload' },
      { label: 'Become a local guide', href: '/experts/join' },
      { label: 'Create an organization', href: '/experts/join' },
    ],
  },
  ne: {
    metadata: {
      title: 'काठमाडौं MTB ट्रेल, स्थानीय गाइड र राइड सपोर्ट',
      description:
        'काठमाडौं र नेपालका MTB ट्रेल, स्थानीय गाइड, राइड सपोर्ट, संस्था, अभियान र बाइक सेवा एउटै ठाउँमा खोज्नुहोस्।',
    },
    heroTitle: 'राइड गर्न लायक ट्रेल खोज्नुहोस्।',
    heroDescription:
      'स्थानीय रुट खोज्नुहोस्, ती रुट चिन्ने गाइडसँग जोडिनुहोस्, र राम्रो जानकारीसहित अर्को राइड योजना बनाउनुहोस्।',
    search: {
      label: 'ट्रेल खोज्नुहोस्',
      placeholder: 'Pharping, Chitlang, enduro, Kathmandu खोज्नुहोस्...',
      button: 'खोज्नुहोस्',
      matchingTitle: 'मिल्दो ट्रेलहरू',
      ideasTitle: 'ट्रेल आइडिया',
      viewAll: 'सबै हेर्नुहोस्',
      seeMore: 'थप ट्रेल हेर्नुहोस्',
      empty: 'यो खोजका लागि ट्रेल भेटिएन। अलि फराकिलो शब्द प्रयोग गर्नुहोस्।',
    },
    spotlightLabels: { event: 'अहिले', ride: 'गाइड', idea: 'आइडिया' },
    rideNotesTitle: 'राइड नोट्स',
    readMore: 'थप पढ्नुहोस्',
    supportPrefix: 'LocoXperts ले तपाईंलाई राम्रो राइड भेट्न सहयोग गर्छ भने',
    supportLink: 'डेभलपरलाई सपोर्ट गर्नुहोस्',
    supportSuffix: 'ताकि प्लेटफर्म चलिरहोस्, सुधारिँदै जाओस्, र स्थानीय राइडरका लागि उपयोगी रहोस्।',
    expertOrganizationPrompt: 'प्रमाणित स्थानीय गाइडहरूले ट्रेल अपलोड गर्न, राइड आयोजना गर्न र अभियान, सेवा, कार्यक्रम तथा ट्रेल कार्यका लागि संस्था बनाउन सक्छन्।',
    expertOrganizationLink: 'स्थानीय गाइडका रूपमा आवेदन दिनुहोस्',
    transparency: {
      eyebrow: 'Platform transparency',
      title: 'LocoXperts ले तपाईंको account data कसरी प्रयोग गर्छ',
      description:
        'LocoXperts नेपालका trail, ride support, local guide, organization, service, campaign, marketplace listing र ride note का लागि बनाइएको platform हो।',
      items: [
        {
          title: 'Sign in किन चाहिन्छ',
          body: 'Account ले riders लाई trail support request गर्न, ride join गर्न, service contact गर्न, marketplace listing report गर्न र आफ्नो profile manage गर्न मद्दत गर्छ।',
        },
        {
          title: 'Google sign-in data',
          body: 'Google बाट continue गर्दा basic Google identity, email र profile information तपाईंको LocoXperts account create वा access गर्न मात्र प्रयोग हुन्छ।',
        },
        {
          title: 'Guide र organization tools',
          body: 'Verified local guide र organization ले account बाट trails, ride programs, services, campaigns र marketplace items manage गर्न सक्छन्।',
        },
      ],
      privacyPrefix: 'हामी personal data बेच्दैनौं। Collection, usage, sharing र deletion details का लागि',
      privacyLink: 'Privacy Policy',
      privacySuffix: 'पढ्नुहोस्।',
    },
    exploreLabel: 'LocoXperts मा हेर्नुहोस्',
    featureActions: [
      { label: 'ट्रेल खोज्नुहोस्', href: '/trails' },
      { label: 'स्थानीय गाइडसँग राइड', href: '/ride-with-experts' },
      { label: 'राइड नोट्स', href: '/ride-notes' },
      { label: 'ठूलो राइडपछि के गर्ने?', href: '/ne/ride-notes/what-now-after-the-big-ride' },
      { label: 'बाइक पसल र सपोर्ट', href: '/store-locator' },
      { label: 'स्थानीय सेवा', href: '/services' },
      { label: 'स्थानीय संस्था', href: '/organizations' },
      { label: 'ट्रेल अभियान', href: '/campaigns' },
      { label: 'ट्रेल अपलोड', href: '/upload' },
      { label: 'स्थानीय गाइड बन्नुहोस्', href: '/ne/experts/join' },
      { label: 'संस्था बनाउनुहोस्', href: '/ne/experts/join' },
    ],
  },
};
