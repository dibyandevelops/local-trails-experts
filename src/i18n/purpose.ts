import type { Locale } from '@/i18n/config';

export type PurposeCopy = {
  metadata: {
    title: string;
    description: string;
  };
  badges: string[];
  heroTitle: string;
  heroBody: string[];
  primaryCta: string;
  secondaryCta: string;
  cards: Array<{
    title: string;
    body: string;
  }>;
  implementedTitle: string;
  implementedDescription: string;
  implementedItems: string[];
  scopedTitle: string;
  scopedDescription: string;
  scopedItems: string[];
  shortEyebrow: string;
  shortTitle: string;
  shortBody: string;
  rideNotesCta: string;
  supportCta: string;
};

export const purposeCopy: Record<Locale, PurposeCopy> = {
  en: {
    metadata: {
      title: 'Purpose: Kathmandu Trails, Local Experts & Ride Support',
      description:
        'LocoXperts helps riders discover trails, request local expert ride support, read ride notes, find cycle hubs, and support trail organizations and campaigns.',
    },
    badges: ['LocoXperts Purpose', 'Trails + Experts', 'Kathmandu First', 'Community Support'],
    heroTitle: 'Help riders plan better local adventures with real trail context.',
    heroBody: [
      'LocoXperts brings trail search, route guides, local experts, ride requests, ride notes, cycle hubs, organizations, and campaigns into one practical place.',
      'The current focus is simple: make Kathmandu and nearby riding zones easier to discover, understand, and ride with the right local support.',
    ],
    primaryCta: 'Browse trails',
    secondaryCta: 'Plan with an expert',
    cards: [
      {
        title: 'For riders',
        body: 'Search trails, compare difficulty and distance, read route guides, check safety context, and open navigation before leaving home.',
      },
      {
        title: 'For local experts',
        body: 'Build a public profile, associate trails you know well, create requestable ride programs, and respond to rider requests with clear availability.',
      },
      {
        title: 'For local support',
        body: 'Organizations, campaigns, cycle hubs, and ride services can be shown near the trails where riders actually need context and support.',
      },
    ],
    implementedTitle: 'What is already in place',
    implementedDescription:
      'The purpose page should describe the product as it exists today, not future promises.',
    implementedItems: [
      'Trail search with maps, route guide, safety labels, and ride support context',
      'Ride with Experts requests and expert-created ride programs',
      'Ride Notes for trail guides, reports, safety notes, and expert notes',
      'Cycle hubs and shop/support listings around riding areas',
      'Organizations, campaign pages, and trail operations for active trail partners',
    ],
    scopedTitle: 'What stays intentionally scoped',
    scopedDescription:
      'LocoXperts should not claim to be a trail construction organization unless that operation is formally active and accountable.',
    scopedItems: [
      'Campaigns support specific organizations and trail work when listed',
      'Platform support keeps hosting, fixes, content tools, and maps running',
      'Safety information helps riders decide better, but does not replace local judgment',
      'Experts and organizers remain independent hosts unless explicitly stated',
    ],
    shortEyebrow: 'Short version',
    shortTitle: 'LocoXperts is a practical trail planning layer for local riders.',
    shortBody:
      'The platform connects trails, experts, ride requests, ride notes, support hubs, organizations, campaigns, and safety context so a rider can make a better plan before choosing where and how to ride.',
    rideNotesCta: 'Read ride notes',
    supportCta: 'Support the platform',
  },
  ne: {
    metadata: {
      title: 'उद्देश्य: काठमाडौं ट्रेल, स्थानीय एक्सपर्ट र राइड सपोर्ट',
      description:
        'LocoXperts ले rider लाई trail खोज्न, local expert ride support माग्न, ride notes पढ्न, cycle hub भेट्न, र trail organization/campaign support गर्न सहयोग गर्छ।',
    },
    badges: ['LocoXperts उद्देश्य', 'ट्रेल + एक्सपर्ट', 'काठमाडौं पहिलो', 'Community Support'],
    heroTitle: 'राइडरलाई वास्तविक trail context सहित राम्रो local adventure plan गर्न सहयोग गर्नु।',
    heroBody: [
      'LocoXperts ले trail search, route guide, local expert, ride request, ride notes, cycle hub, organization र campaign लाई एउटै practical ठाउँमा ल्याउँछ।',
      'अहिलेको focus सरल छ: काठमाडौं र नजिकका riding zone लाई खोज्न, बुझ्न र सही local support सहित ride गर्न सजिलो बनाउने।',
    ],
    primaryCta: 'ट्रेल हेर्नुहोस्',
    secondaryCta: 'एक्सपर्टसँग plan गर्नुहोस्',
    cards: [
      {
        title: 'राइडरका लागि',
        body: 'Trail search गर्नुहोस्, difficulty र distance compare गर्नुहोस्, route guide पढ्नुहोस्, safety context हेर्नुहोस्, र घरबाट निस्कनु अघि navigation खोल्नुहोस्।',
      },
      {
        title: 'स्थानीय एक्सपर्टका लागि',
        body: 'Public profile बनाउनुहोस्, आफूलाई राम्रोसँग थाहा भएका trails associate गर्नुहोस्, requestable ride program बनाउनुहोस्, र rider request लाई clear availability सहित respond गर्नुहोस्।',
      },
      {
        title: 'Local support का लागि',
        body: 'Organization, campaign, cycle hub र ride service लाई rider लाई context र support चाहिने trail नजिकै देखाउन सकिन्छ।',
      },
    ],
    implementedTitle: 'अहिले उपलब्ध कुरा',
    implementedDescription:
      'Purpose page ले आज platform मा भएको कुरा देखाउनुपर्छ, future promise होइन।',
    implementedItems: [
      'Map, route guide, safety labels र ride support context सहित trail search',
      'Ride with Experts request र expert-created ride programs',
      'Trail guide, ride report, safety note र expert note का लागि Ride Notes',
      'Riding area वरिपरि cycle hub र shop/support listings',
      'Active trail partners का लागि organization, campaign page र trail operations',
    ],
    scopedTitle: 'जानाजान scope मा राखिएका कुरा',
    scopedDescription:
      'Formal र accountable operation नभएसम्म LocoXperts ले आफूलाई trail construction organization भनेर claim गर्नु हुँदैन।',
    scopedItems: [
      'Campaigns ले listed specific organization र trail work support गर्छ',
      'Platform support ले hosting, fixes, content tools र maps चलाइराख्छ',
      'Safety information ले rider लाई राम्रो decision लिन मद्दत गर्छ, तर local judgment replace गर्दैन',
      'Expert र organizer स्पष्ट रूपमा नलेखिएसम्म independent hosts हुन्',
    ],
    shortEyebrow: 'छोटोमा',
    shortTitle: 'LocoXperts local riders का लागि practical trail planning layer हो।',
    shortBody:
      'Platform ले trails, experts, ride requests, ride notes, support hubs, organizations, campaigns र safety context जोड्छ, ताकि rider ले कहाँ र कसरी ride गर्ने भन्ने राम्रो plan बनाउन सकोस्।',
    rideNotesCta: 'Ride notes पढ्नुहोस्',
    supportCta: 'Platform support गर्नुहोस्',
  },
};
