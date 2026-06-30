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
      title: 'Kathmandu MTB Trails, Local Experts & Ride Support',
      description:
        'Find Kathmandu and Nepal MTB trails, route guides, local experts, ride support, organizations, campaigns, and bike services in one place.',
    },
    heroTitle: 'Find trails worth riding.',
    heroDescription:
      'Search local routes, meet the experts who know them, and find support before the ride.',
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
    spotlightLabels: { event: 'Now', ride: 'Expert', idea: 'Idea' },
    rideNotesTitle: 'Ride notes',
    readMore: 'Read more',
    supportPrefix: 'If LocoXperts helps you find better rides, consider',
    supportLink: 'supporting the developer',
    supportSuffix: 'so the platform can stay alive, improve, and remain useful for local riders.',
    expertOrganizationPrompt: 'Verified experts can create an organization workspace for programs, campaigns, services, and trail work.',
    expertOrganizationLink: 'Register and verify as an expert',
    exploreLabel: 'Explore LocoXperts',
    featureActions: [
      { label: 'Find trails', href: '/trails' },
      { label: 'Ride with experts', href: '/ride-with-experts' },
      { label: 'Ride notes', href: '/ride-notes' },
      { label: 'Bike shops and support', href: '/store-locator' },
      { label: 'Local services', href: '/services' },
      { label: 'Local organizations', href: '/organizations' },
      { label: 'Trail campaigns', href: '/campaigns' },
      { label: 'Share a trail', href: '/upload' },
      { label: 'Join as an expert', href: '/experts/join' },
      { label: 'Create an organization', href: '/experts/join' },
    ],
  },
  ne: {
    metadata: {
      title: 'काठमाडौं MTB ट्रेल, स्थानीय एक्सपर्ट र राइड सपोर्ट',
      description:
        'काठमाडौं र नेपालका MTB ट्रेल, रुट गाइड, स्थानीय एक्सपर्ट, राइड सपोर्ट, संस्था, अभियान र बाइक सेवा एउटै ठाउँमा खोज्नुहोस्।',
    },
    heroTitle: 'राइड गर्न लायक ट्रेल खोज्नुहोस्।',
    heroDescription:
      'स्थानीय रुट खोज्नुहोस्, ती रुट चिन्ने एक्सपर्ट भेट्नुहोस्, र राइड अघि चाहिने सपोर्ट पत्ता लगाउनुहोस्।',
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
    spotlightLabels: { event: 'अहिले', ride: 'एक्सपर्ट', idea: 'आइडिया' },
    rideNotesTitle: 'राइड नोट्स',
    readMore: 'थप पढ्नुहोस्',
    supportPrefix: 'LocoXperts ले तपाईंलाई राम्रो राइड भेट्न सहयोग गर्छ भने',
    supportLink: 'डेभलपरलाई सपोर्ट गर्नुहोस्',
    supportSuffix: 'ताकि प्लेटफर्म चलिरहोस्, सुधारिँदै जाओस्, र स्थानीय राइडरका लागि उपयोगी रहोस्।',
    expertOrganizationPrompt: 'प्रमाणित एक्सपर्टहरूले कार्यक्रम, अभियान, सेवा र ट्रेल कार्यका लागि संस्था वर्कस्पेस बनाउन सक्छन्।',
    expertOrganizationLink: 'एक्सपर्टका रूपमा दर्ता र प्रमाणीकरण गर्नुहोस्',
    exploreLabel: 'LocoXperts मा हेर्नुहोस्',
    featureActions: [
      { label: 'ट्रेल खोज्नुहोस्', href: '/trails' },
      { label: 'एक्सपर्टसँग राइड', href: '/ride-with-experts' },
      { label: 'राइड नोट्स', href: '/ride-notes' },
      { label: 'बाइक पसल र सपोर्ट', href: '/store-locator' },
      { label: 'स्थानीय सेवा', href: '/services' },
      { label: 'स्थानीय संस्था', href: '/organizations' },
      { label: 'ट्रेल अभियान', href: '/campaigns' },
      { label: 'ट्रेल अपलोड', href: '/upload' },
      { label: 'एक्सपर्ट बन्नुहोस्', href: '/experts/join' },
      { label: 'संस्था बनाउनुहोस्', href: '/experts/join' },
    ],
  },
};
