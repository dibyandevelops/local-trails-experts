import type { Locale } from '@/i18n/config';

type GuideJoinCopy = {
  checkingAccount: string;
  pending: { title: string; body: string; action: string };
  verified: { title: string; body: string; action: string };
  admin: { title: string; body: string; action: string };
  hero: { eyebrow: string; title: string; description: string; opportunity: string };
  form: {
    existingTitle: string;
    newTitle: string;
    existingDescription: string;
    newDescription: string;
    fullName: string;
    fullNamePlaceholder: string;
    email: string;
    emailPlaceholder: string;
    currentEmail: string;
    phone: string;
    phonePlaceholder: string;
    phoneHelper: string;
    password: string;
    passwordPlaceholder: string;
    passwordExistingPlaceholder: string;
    passwordHelper: string;
    passwordExistingHelper: string;
    homeCity: string;
    homeCityPlaceholder: string;
    activities: string;
    experience: string;
    generate: string;
    generating: string;
    experiencePlaceholder: string;
    agreementPrefix: string;
    terms: string;
    and: string;
    privacy: string;
    submitting: string;
    submit: string;
    existingSubmitNote: string;
    newSubmitNote: string;
  };
  beforeTitle: string;
  beforeItems: string[];
  afterTitle: string;
  afterItems: string[];
  sportLabels: Record<string, string>;
  acceptTermsError: string;
  genericError: string;
  bioError: string;
};

export const guideJoinCopy: Record<Locale, GuideJoinCopy> = {
  en: {
    checkingAccount: 'Checking your account...',
    pending: {
      title: 'Guide application is pending',
      body: 'Your application is awaiting review. You can update the verification details from your dashboard.',
      action: 'View dashboard',
    },
    verified: {
      title: 'You are already a verified guide',
      body: 'Manage your guide profile from the dashboard, or create an organization for programs, services, campaigns, and trail work.',
      action: 'Create organization',
    },
    admin: {
      title: 'Use a participant account to apply',
      body: 'Admin accounts cannot become public guide profiles. Sign in with a participant account or create a separate account.',
      action: 'Go home',
    },
    hero: {
      eyebrow: 'Local guides',
      title: 'Become a local guide',
      description: 'Share trail knowledge, guide riders, coach skills, or host local rides around Nepal.',
      opportunity: 'Once verified, you can upload trails you know, host free or paid events, or create an organization for campaigns, services, and ride programs.',
    },
    form: {
      existingTitle: 'Apply with this account',
      newTitle: 'Create your guide profile',
      existingDescription: 'We will use your current login and submit the profile for review.',
      newDescription: 'Start with the essentials. Add verification details after signup.',
      fullName: 'Full name',
      fullNamePlaceholder: 'e.g., Suman Gurung',
      email: 'Email',
      emailPlaceholder: 'you@example.com',
      currentEmail: 'Using the email from your signed-in account.',
      phone: 'Phone number',
      phonePlaceholder: '+9779812345678',
      phoneHelper: 'Use international format, e.g. +977...',
      password: 'Password',
      passwordPlaceholder: 'Min 8 characters with a number',
      passwordExistingPlaceholder: 'Not needed for signed-in accounts',
      passwordHelper: 'At least 8 characters and one number.',
      passwordExistingHelper: 'Your existing account password remains unchanged.',
      homeCity: 'Home city',
      homeCityPlaceholder: 'e.g., Kathmandu',
      activities: 'Activities you guide',
      experience: 'About your experience',
      generate: 'Generate with AI',
      generating: 'Generating...',
      experiencePlaceholder: 'Tell riders about your local trail knowledge, guiding experience, and riding style.',
      agreementPrefix: 'I agree to the',
      terms: 'Terms & Conditions',
      and: 'and',
      privacy: 'Privacy Policy',
      submitting: 'Submitting...',
      submit: 'Apply as a guide',
      existingSubmitNote: 'Approval is required before your guide profile becomes public.',
      newSubmitNote: 'After signup, complete verification from your dashboard.',
    },
    beforeTitle: 'Before you apply',
    beforeItems: [
      'Know at least one local trail or riding area well.',
      'Be clear about conditions, pace, and rider safety.',
      'Share honest experience. Certificates are optional.',
    ],
    afterTitle: 'After submission',
    afterItems: [
      'Complete any requested verification details.',
      'We review and publish approved profiles.',
      'Upload trails, host rides, respond to requests, or build an organization.',
    ],
    sportLabels: {},
    acceptTermsError: 'Please accept the terms and privacy policy.',
    genericError: 'Something went wrong. Please try again.',
    bioError: 'Unable to generate the guide description.',
  },
  ne: {
    checkingAccount: 'तपाईंको खाता जाँच हुँदैछ...',
    pending: {
      title: 'गाइड आवेदन समीक्षामा छ',
      body: 'तपाईंको आवेदन समीक्षा हुँदैछ। ड्यासबोर्डबाट प्रमाणीकरण विवरण अद्यावधिक गर्न सक्नुहुन्छ।',
      action: 'ड्यासबोर्ड हेर्नुहोस्',
    },
    verified: {
      title: 'तपाईं प्रमाणित स्थानीय गाइड हुनुहुन्छ',
      body: 'ड्यासबोर्डबाट गाइड प्रोफाइल व्यवस्थापन गर्नुहोस् वा कार्यक्रम, सेवा, अभियान र ट्रेल कार्यका लागि संस्था बनाउनुहोस्।',
      action: 'संस्था बनाउनुहोस्',
    },
    admin: {
      title: 'आवेदनका लागि सहभागी खाता प्रयोग गर्नुहोस्',
      body: 'एडमिन खातालाई सार्वजनिक गाइड प्रोफाइल बनाउन मिल्दैन। सहभागी खाताबाट साइन इन गर्नुहोस् वा छुट्टै खाता बनाउनुहोस्।',
      action: 'होममा जानुहोस्',
    },
    hero: {
      eyebrow: 'स्थानीय गाइड',
      title: 'स्थानीय गाइड बन्नुहोस्',
      description: 'नेपालका ट्रेलबारे ज्ञान बाँड्नुहोस्, राइडरलाई गाइड गर्नुहोस्, सीप सिकाउनुहोस् वा स्थानीय राइड आयोजना गर्नुहोस्।',
      opportunity: 'प्रमाणित भएपछि आफूले चिनेका ट्रेल अपलोड गर्न, निःशुल्क वा सशुल्क इभेन्ट आयोजना गर्न, वा अभियान, सेवा र राइड कार्यक्रमका लागि संस्था बनाउन सक्नुहुन्छ।',
    },
    form: {
      existingTitle: 'यही खाताबाट आवेदन दिनुहोस्',
      newTitle: 'आफ्नो गाइड प्रोफाइल बनाउनुहोस्',
      existingDescription: 'हामी तपाईंको हालको लगइन प्रयोग गरेर प्रोफाइल समीक्षाका लागि पठाउनेछौं।',
      newDescription: 'आधारभूत विवरणबाट सुरु गर्नुहोस्। साइनअपपछि प्रमाणीकरण विवरण थप्न सकिन्छ।',
      fullName: 'पूरा नाम',
      fullNamePlaceholder: 'जस्तै, सुमन गुरुङ',
      email: 'इमेल',
      emailPlaceholder: 'you@example.com',
      currentEmail: 'साइन इन गरिएको खाताको इमेल प्रयोग हुँदैछ।',
      phone: 'फोन नम्बर',
      phonePlaceholder: '+9779812345678',
      phoneHelper: 'अन्तर्राष्ट्रिय ढाँचा प्रयोग गर्नुहोस्, जस्तै +977...',
      password: 'पासवर्ड',
      passwordPlaceholder: 'कम्तीमा ८ अक्षर र एउटा नम्बर',
      passwordExistingPlaceholder: 'साइन इन गरिएको खाताका लागि आवश्यक छैन',
      passwordHelper: 'कम्तीमा ८ अक्षर र एउटा नम्बर राख्नुहोस्।',
      passwordExistingHelper: 'तपाईंको हालको पासवर्ड परिवर्तन हुँदैन।',
      homeCity: 'बसोबासको सहर',
      homeCityPlaceholder: 'जस्तै, काठमाडौं',
      activities: 'तपाईंले गाइड गर्ने गतिविधि',
      experience: 'आफ्नो अनुभवबारे',
      generate: 'AI बाट तयार गर्नुहोस्',
      generating: 'तयार हुँदैछ...',
      experiencePlaceholder: 'आफ्नो स्थानीय ट्रेल ज्ञान, गाइड अनुभव र राइडिङ शैलीबारे लेख्नुहोस्।',
      agreementPrefix: 'म',
      terms: 'नियम तथा सर्तहरू',
      and: 'र',
      privacy: 'गोपनीयता नीति',
      submitting: 'पठाइँदैछ...',
      submit: 'गाइडका रूपमा आवेदन दिनुहोस्',
      existingSubmitNote: 'गाइड प्रोफाइल सार्वजनिक हुनुअघि स्वीकृति आवश्यक हुन्छ।',
      newSubmitNote: 'साइनअपपछि ड्यासबोर्डबाट प्रमाणीकरण पूरा गर्नुहोस्।',
    },
    beforeTitle: 'आवेदन दिनुअघि',
    beforeItems: [
      'कम्तीमा एउटा स्थानीय ट्रेल वा राइडिङ क्षेत्र राम्रोसँग चिन्नुहोस्।',
      'ट्रेल अवस्था, गति र राइडर सुरक्षाबारे स्पष्ट हुनुहोस्।',
      'आफ्नो अनुभव सही रूपमा लेख्नुहोस्। प्रमाणपत्र वैकल्पिक हो।',
    ],
    afterTitle: 'आवेदनपछि',
    afterItems: [
      'मागिएको प्रमाणीकरण विवरण पूरा गर्नुहोस्।',
      'हामी समीक्षा गरेर स्वीकृत प्रोफाइल प्रकाशित गर्छौं।',
      'ट्रेल अपलोड गर्नुहोस्, राइड आयोजना गर्नुहोस्, अनुरोध लिनुहोस् वा संस्था बनाउनुहोस्।',
    ],
    sportLabels: {
      mtb: 'माउन्टेन बाइकिङ',
      downhill_mtb: 'डाउनहिल MTB',
      enduro_mtb: 'एन्डुरो MTB',
      hiking: 'हाइकिङ',
      trail_running: 'ट्रेल रनिङ',
      devotion_trail_rides: 'धार्मिक ट्रेल राइड (मन्दिर लूप)',
      road_cycling: 'रोड साइक्लिङ',
      xc_trails: 'XC ट्रेल',
      gravel_rides: 'ग्राभेल राइड',
    },
    acceptTermsError: 'कृपया नियम तथा सर्त र गोपनीयता नीति स्वीकार गर्नुहोस्।',
    genericError: 'केही समस्या भयो। कृपया फेरि प्रयास गर्नुहोस्।',
    bioError: 'गाइड विवरण तयार गर्न सकिएन।',
  },
};
