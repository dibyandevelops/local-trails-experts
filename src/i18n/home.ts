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
    exploreLabel: 'Explore LocoXperts',
    featureActions: [
      { label: 'Find trails', href: '/trails' },
      { label: 'Ride with local guides', href: '/ride-with-experts' },
      { label: 'Ride notes', href: '/ride-notes' },
      { label: 'Kora preparation note', href: '/ride-notes/how-to-prepare-for-kora-2026' },
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
    exploreLabel: 'LocoXperts मा हेर्नुहोस्',
    featureActions: [
      { label: 'ट्रेल खोज्नुहोस्', href: '/trails' },
      { label: 'स्थानीय गाइडसँग राइड', href: '/ride-with-experts' },
      { label: 'राइड नोट्स', href: '/ride-notes' },
      { label: 'कोरा तयारी नोट', href: '/ne/ride-notes/how-to-prepare-for-kora-2026' },
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
