import type { Locale } from '@/i18n/config';

export type ServicesCopy = {
  metadata: { title: string; description: string };
  hero: { eyebrow: string; title: string; description: string };
  business: {
    eyebrow: string;
    title: string;
    description: string;
    contact: string;
    whatsappMessage: string;
    items: Array<{ title: string; description: string }>;
  };
  directory: { eyebrow: string; title: string; description: string };
  search: { label: string; placeholder: string; category: string; all: string };
  categories: Record<string, string>;
  listing: {
    pending: string;
    from: string;
    contactForPricing: string;
    details: string;
    noResults: string;
    error: string;
  };
  booking: {
    request: string;
    whatsapp: string;
    checking: string;
    signIn: string;
    requestError: string;
    sent: string;
    title: string;
    description: string;
    accountNotice: string;
    date: string;
    time: string;
    groupSize: string;
    phone: string;
    phonePlaceholder: string;
    notes: string;
    notesPlaceholder: string;
    cancel: string;
    sending: string;
    send: string;
    close: string;
    whatsappLabel: string;
    whatsappMessage: string;
  };
};

export const servicesCopy: Record<Locale, ServicesCopy> = {
  en: {
    metadata: {
      title: 'Business IT and Local Cycling Services | LocoXperts',
      description:
        'Find website development, digital marketing, sales systems, Google Maps setup, IT support, and cycling services from local organizations.',
    },
    hero: {
      eyebrow: 'Local expertise for hire',
      title: 'Services for businesses and better rides',
      description:
        'Digital and IT support for small and medium businesses, alongside local cycling services and community providers.',
    },
    business: {
      eyebrow: 'For small and medium businesses',
      title: 'Practical digital services from LocoXperts',
      description:
        'From getting found online to organizing leads and everyday technology, we can help shape a setup that fits your business.',
      contact: 'Chat with us on WhatsApp',
      whatsappMessage: 'Hi, I am interested in small business digital services from LocoXperts.',
      items: [
        {
          title: 'Websites and online stores',
          description:
            'Plan, build, refresh, and maintain a mobile-friendly website or online store that helps customers understand and choose your business.',
        },
        {
          title: 'Google Maps and local presence',
          description:
            'Set up or improve your Google Business Profile, map listing, business hours, photos, and local search information.',
        },
        {
          title: 'Sales and customer systems',
          description:
            'Make it easier to capture enquiries, follow up leads, manage customer relationships, and see where sales are coming from.',
        },
        {
          title: 'Digital marketing and SEO',
          description:
            'Improve how customers find you with practical search optimization, content planning, and digital campaign support.',
        },
        {
          title: 'Small-business IT support',
          description:
            'Get help choosing and setting up business tools, email, cloud services, and everyday technology workflows.',
        },
      ],
    },
    directory: {
      eyebrow: 'Community directory',
      title: 'Services from local organizations',
      description:
        'Browse published cycling and business service listings from verified organizations.',
    },
    search: {
      label: 'Search services',
      placeholder: 'Search service, location, or organization',
      category: 'Service category',
      all: 'All services',
    },
    categories: {},
    listing: {
      pending: 'Pending',
      from: 'From NPR',
      contactForPricing: 'Contact for pricing',
      details: 'Details',
      noResults:
        'No organization service listings match these filters yet. You can contact LocoXperts about the business services above.',
      error: 'Could not load services. Please try again.',
    },
    booking: {
      request: 'Request service',
      whatsapp: 'WhatsApp',
      checking: 'Checking your account. Please try again in a second.',
      signIn: 'Create a free account or sign in to request this service.',
      requestError: 'Failed to request booking.',
      sent: 'Booking request sent. The organization will confirm the schedule.',
      title: 'Request service',
      description:
        'Ask {organization} about {service}. They will review your preferred schedule and confirm it.',
      accountNotice:
        'Requesting as {name}. This sends a service request only. Confirmation and payment happen after the organization replies.',
      date: 'Preferred date',
      time: 'Preferred time',
      groupSize: 'Group size',
      phone: 'Phone',
      phonePlaceholder: 'Contact number',
      notes: 'Notes',
      notesPlaceholder: 'Tell the organization about your group, requirements, or questions.',
      cancel: 'Cancel',
      sending: 'Sending...',
      send: 'Send request',
      close: 'Close',
      whatsappLabel: 'Contact {organization} on WhatsApp about {service}',
      whatsappMessage: 'Namaste, I would like to ask about {service} on LocoXperts.',
    },
  },
  ne: {
    metadata: {
      title: 'व्यवसायका लागि IT र स्थानीय साइकलिङ सेवा | LocoXperts',
      description:
        'स्थानीय संस्थाबाट वेबसाइट विकास, डिजिटल मार्केटिङ, बिक्री प्रणाली, Google Maps सेटअप, IT सहायता र साइकलिङ सेवा खोज्नुहोस्।',
    },
    hero: {
      eyebrow: 'स्थानीय सेवा प्रदायकहरू',
      title: 'व्यवसाय र राम्रो राइडका लागि सेवा',
      description:
        'साना तथा मझौला व्यवसायका लागि डिजिटल र IT सहायता, साथै स्थानीय साइकलिङ सेवा र सामुदायिक सेवा प्रदायकहरू।',
    },
    business: {
      eyebrow: 'साना तथा मझौला व्यवसायका लागि',
      title: 'LocoXperts का व्यावहारिक डिजिटल सेवा',
      description:
        'अनलाइनमा ग्राहकले तपाईंलाई भेट्टाउनेदेखि सम्भावित ग्राहक र दैनिक प्रविधि व्यवस्थापनसम्म, तपाईंको व्यवसायलाई मिल्ने प्रणाली बनाउन हामी सहयोग गर्छौं।',
      contact: 'WhatsApp मा हामीलाई सन्देश पठाउनुहोस्',
      whatsappMessage: 'नमस्ते, LocoXperts का साना व्यवसायसम्बन्धी डिजिटल सेवाबारे जानकारी चाहन्छु।',
      items: [
        {
          title: 'वेबसाइट र अनलाइन पसल',
          description:
            'ग्राहकले तपाईंको व्यवसाय बुझ्न र सेवा छान्न सक्ने मोबाइलमैत्री वेबसाइट वा अनलाइन पसल योजना बनाउने, निर्माण गर्ने, सुधार गर्ने र नियमित व्यवस्थापन गर्ने।',
        },
        {
          title: 'Google Maps र स्थानीय उपस्थिति',
          description:
            'Google Business Profile, नक्सामा व्यवसायको विवरण, खुल्ने समय, तस्बिर र स्थानीय खोजसम्बन्धी जानकारी सेटअप वा सुधार गर्ने।',
        },
        {
          title: 'बिक्री र ग्राहक व्यवस्थापन प्रणाली',
          description:
            'ग्राहकका सोधपुछ टिप्न, सम्भावित ग्राहकसँग फेरि सम्पर्क गर्न, ग्राहक सम्बन्ध व्यवस्थापन गर्न र बिक्री कहाँबाट आइरहेको छ बुझ्न सहयोग गर्ने।',
        },
        {
          title: 'डिजिटल मार्केटिङ र SEO',
          description:
            'खोज इन्जिनमा देखिने तरिका, सामग्री योजना र डिजिटल अभियानमार्फत ग्राहकले तपाईंको व्यवसाय भेट्टाउन सजिलो बनाउने।',
        },
        {
          title: 'साना व्यवसायका लागि IT सहायता',
          description:
            'व्यवसायका डिजिटल उपकरण, इमेल, क्लाउड सेवा र दैनिक प्रविधि कार्यप्रवाह छान्न तथा सेटअप गर्न सहयोग पाउनुहोस्।',
        },
      ],
    },
    directory: {
      eyebrow: 'सामुदायिक सेवा सूची',
      title: 'स्थानीय संस्थाका सेवाहरू',
      description:
        'प्रमाणित संस्थाले प्रकाशित गरेका साइकलिङ र व्यवसायसम्बन्धी सेवा हेर्नुहोस्।',
    },
    search: {
      label: 'सेवा खोज्नुहोस्',
      placeholder: 'सेवा, स्थान वा संस्था खोज्नुहोस्',
      category: 'सेवाको प्रकार',
      all: 'सबै सेवा',
    },
    categories: {
      ride_photography: 'राइड फोटोग्राफी',
      shuttle_transport: 'शटल र यातायात',
      creative_design: 'ग्राफिक्स र डिजाइन',
      guiding: 'गाइड सेवा',
      training: 'तालिम',
      bike_rental: 'साइकल भाडा',
      repair_support: 'मर्मत सहायता',
      event_support: 'कार्यक्रम सहायता',
      web_development: 'वेबसाइट डिजाइन र विकास',
      digital_marketing: 'डिजिटल मार्केटिङ र SEO',
      sales_support: 'बिक्री र ग्राहक प्रणाली',
      it_support: 'IT सहायता र परामर्श',
      maps_presence: 'Google Maps र स्थानीय सूची',
      other: 'अन्य',
    },
    listing: {
      pending: 'समीक्षामा',
      from: 'सुरु मूल्य NPR',
      contactForPricing: 'मूल्यका लागि सम्पर्क गर्नुहोस्',
      details: 'विवरण',
      noResults:
        'यी फिल्टरसँग मिल्ने संस्थाका सेवा सूची भेटिएनन्। माथिका व्यवसाय सेवाबारे LocoXperts लाई सम्पर्क गर्न सक्नुहुन्छ।',
      error: 'सेवा लोड गर्न सकिएन। कृपया फेरि प्रयास गर्नुहोस्।',
    },
    booking: {
      request: 'सेवा अनुरोध गर्नुहोस्',
      whatsapp: 'WhatsApp',
      checking: 'तपाईंको खाता जाँच हुँदैछ। कृपया केही बेरपछि फेरि प्रयास गर्नुहोस्।',
      signIn: 'यो सेवा अनुरोध गर्न निःशुल्क खाता बनाउनुहोस् वा साइन इन गर्नुहोस्।',
      requestError: 'सेवा अनुरोध पठाउन सकिएन।',
      sent: 'सेवा अनुरोध पठाइयो। संस्थाले समयतालिका पुष्टि गर्नेछ।',
      title: 'सेवा अनुरोध गर्नुहोस्',
      description:
        '{organization} सँग {service} बारे सोध्नुहोस्। उहाँहरूले तपाईंको रोजेको समय हेरेर पुष्टि गर्नुहुनेछ।',
      accountNotice:
        '{name} को रूपमा अनुरोध गर्दै हुनुहुन्छ। यसले सेवा अनुरोध मात्र पठाउँछ। संस्थाले जवाफ दिएपछि समय र भुक्तानी पुष्टि हुनेछ।',
      date: 'रोजेको मिति',
      time: 'रोजेको समय',
      groupSize: 'समूहको आकार',
      phone: 'फोन',
      phonePlaceholder: 'सम्पर्क नम्बर',
      notes: 'थप जानकारी',
      notesPlaceholder: 'आफ्नो समूह, आवश्यकता वा प्रश्नबारे संस्थालाई जानकारी दिनुहोस्।',
      cancel: 'रद्द गर्नुहोस्',
      sending: 'पठाउँदै...',
      send: 'अनुरोध पठाउनुहोस्',
      close: 'बन्द गर्नुहोस्',
      whatsappLabel: '{service} बारे {organization} लाई WhatsApp मा सम्पर्क गर्नुहोस्',
      whatsappMessage: 'नमस्ते, LocoXperts मा रहेको {service} बारे जानकारी लिन चाहन्छु।',
    },
  },
};
