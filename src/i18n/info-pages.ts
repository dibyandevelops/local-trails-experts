import type { Locale } from '@/i18n/config';

export type LocalizedInfoPage = {
  metadata: { title: string; description: string };
  hero: {
    eyebrow: string;
    title: string;
    description: string;
    updated?: string;
    actions?: Array<{ label: string; href: string; variant?: 'primary' | 'secondary' }>;
  };
  sections: Array<{
    title: string;
    body?: string[];
    items?: string[];
  }>;
};

export const infoPageCopy: Record<string, Record<Locale, LocalizedInfoPage>> = {
  faq: {
    en: {
      metadata: { title: 'FAQ', description: 'Quick answers about LocoXperts trails, experts, events, safety, and accounts.' },
      hero: {
        eyebrow: 'Help center',
        title: 'Quick answers before you ride, book, or contribute.',
        description: 'A compact guide to common questions about trails, ride support, events, experts, organizations, safety, and privacy.',
        actions: [
          { label: 'Browse trails', href: '/trails' },
          { label: 'Read safety policy', href: '/safety', variant: 'secondary' },
        ],
      },
      sections: [
        { title: 'Trails and ride support', items: ['Trail pages can include route maps, sport type, distance, elevation, difficulty, route guide, services, trail updates, campaigns, and associated experts.', 'You can request a custom trail ride from a trail page with preferred date, timing, nearest point, and support details.', 'Admins and authorized organization users can publish active trail alerts and updates.'] },
        { title: 'Events and bookings', items: ['Open the event page, review details, and use the join action.', 'Paid bookings are confirmed after payment proof or payment status is verified.', 'Some events may be full, past, or unavailable for booking.'] },
        { title: 'Experts and organizations', items: ['Experts submit profile and application details for admin review.', 'Approved organizations can manage relevant trail updates, gallery items, services, campaigns, and organization information.', 'Cycle hubs and partners can be listed after review.'] },
        { title: 'Privacy, safety, and accounts', items: ['LocoXperts does not sell personal data.', 'Read the privacy, terms, and safety pages for platform policies.', 'Account deletion requests are reviewed manually for safety and compliance.'] },
      ],
    },
    ne: {
      metadata: { title: 'सोधिने प्रश्नहरू', description: 'LocoXperts का ट्रेल, एक्सपर्ट, इभेन्ट, सुरक्षा र खाताबारे छोटो उत्तरहरू।' },
      hero: {
        eyebrow: 'सहायता केन्द्र',
        title: 'राइड, बुकिङ वा योगदान अघि छिटो उत्तरहरू।',
        description: 'ट्रेल, राइड सपोर्ट, इभेन्ट, एक्सपर्ट, संस्था, सुरक्षा र गोपनीयताबारे सामान्य प्रश्नहरूको छोटो गाइड।',
        actions: [
          { label: 'ट्रेल हेर्नुहोस्', href: '/trails' },
          { label: 'सुरक्षा नीति पढ्नुहोस्', href: '/ne/safety', variant: 'secondary' },
        ],
      },
      sections: [
        { title: 'ट्रेल र राइड सपोर्ट', items: ['ट्रेल पेजमा रुट म्याप, खेल प्रकार, दूरी, उचाइ, कठिनाइ, रुट गाइड, सेवा, अपडेट, अभियान र सम्बन्धित एक्सपर्ट देखिन सक्छन्।', 'ट्रेल पेजबाट आफूलाई चाहिएको मिति, समय, नजिकको स्थान र सपोर्ट विवरणसहित राइड अनुरोध गर्न सकिन्छ।', 'एडमिन र अनुमति भएका संस्थाले सक्रिय ट्रेल अलर्ट र अपडेट राख्न सक्छन्।'] },
        { title: 'इभेन्ट र बुकिङ', items: ['इभेन्ट पेज खोल्नुहोस्, विवरण हेर्नुहोस्, अनि join action प्रयोग गर्नुहोस्।', 'भुक्तानी प्रमाण वा भुक्तानी स्थिति जाँच भएपछि paid booking पुष्टि हुन्छ।', 'केही इभेन्ट भरिएको, मिति बितेको, वा बुकिङका लागि उपलब्ध नहुन सक्छ।'] },
        { title: 'एक्सपर्ट र संस्था', items: ['एक्सपर्टले प्रोफाइल र आवेदन विवरण बुझाउँछन्, एडमिनले समीक्षा गर्छ।', 'स्वीकृत संस्थाले सम्बन्धित ट्रेल अपडेट, ग्यालरी, सेवा, अभियान र संस्थाको जानकारी व्यवस्थापन गर्न सक्छन्।', 'Cycle hub र partner लाई समीक्षा पछि सूचीकृत गर्न सकिन्छ।'] },
        { title: 'गोपनीयता, सुरक्षा र खाता', items: ['LocoXperts ले व्यक्तिगत डेटा बेच्दैन।', 'नीतिका लागि गोपनीयता, सर्तहरू र सुरक्षा पेज पढ्नुहोस्।', 'खाता हटाउने अनुरोध सुरक्षा र compliance का लागि म्यानुअल समीक्षा गरिन्छ।'] },
      ],
    },
  },
  privacy: {
    en: {
      metadata: { title: 'Privacy Policy', description: 'How LocoXperts collects, uses, and protects user data.' },
      hero: { eyebrow: 'Privacy', title: 'Your data should be useful, limited, and protected.', description: 'LocoXperts collects only the information needed to run accounts, trail requests, events, expert workflows, and community support. We do not sell personal data.', updated: 'March 12, 2026', actions: [{ label: 'Read terms', href: '/terms' }] },
      sections: [
        { title: 'What we collect', items: ['Account details such as name, email, phone, role, and profile information.', 'Trail, event, booking, campaign, and request activity needed to operate the platform.', 'Uploaded content such as profile details, trail images, payment proof, or organization information.'] },
        { title: 'How we use it', items: ['To help participants discover trails, join events, and request ride support.', 'To let experts and organizations manage relevant operations.', 'To review safety, moderation, verification, payment, and compliance requests.'] },
        { title: 'Data sharing', body: ['We do not sell personal data. We only share information when needed to deliver a feature, comply with legal or safety obligations, process operations, or communicate between participants, experts, organizers, and administrators.', 'The platform currently focuses on Nepal trail communities. If the region or data practices materially change, this policy should be updated before that expansion.'] },
        { title: 'Account deletion', items: ['Submit a deletion request with an optional reason.', 'We review pending obligations and compliance requirements.', 'You receive email updates when the request is approved, rejected, or completed.'] },
        { title: 'Contact', body: ['Questions about privacy can be sent to the LocoXperts team through the footer support or feedback flow.'] },
      ],
    },
    ne: {
      metadata: { title: 'गोपनीयता नीति', description: 'LocoXperts ले प्रयोगकर्ता डेटा कसरी संकलन, प्रयोग र सुरक्षित गर्छ।' },
      hero: { eyebrow: 'गोपनीयता', title: 'तपाईंको डेटा उपयोगी, सीमित र सुरक्षित हुनुपर्छ।', description: 'LocoXperts ले खाता, ट्रेल अनुरोध, इभेन्ट, एक्सपर्ट workflow र community support चलाउन चाहिने जानकारी मात्र संकलन गर्छ। हामी व्यक्तिगत डेटा बेच्दैनौं।', updated: 'March 12, 2026', actions: [{ label: 'सर्तहरू पढ्नुहोस्', href: '/ne/terms' }] },
      sections: [
        { title: 'हामी के संकलन गर्छौं', items: ['नाम, इमेल, फोन, भूमिका र प्रोफाइल जानकारी जस्ता खाता विवरण।', 'प्लेटफर्म चलाउन चाहिने ट्रेल, इभेन्ट, बुकिङ, अभियान र अनुरोध गतिविधि।', 'प्रोफाइल विवरण, ट्रेल फोटो, payment proof वा संस्था जानकारी जस्ता uploaded content।'] },
        { title: 'हामी कसरी प्रयोग गर्छौं', items: ['Participant लाई ट्रेल खोज्न, इभेन्ट join गर्न र ride support माग्न सहयोग गर्न।', 'Expert र organization लाई सम्बन्धित operation व्यवस्थापन गर्न दिन।', 'Safety, moderation, verification, payment र compliance request समीक्षा गर्न।'] },
        { title: 'डेटा साझेदारी', body: ['हामी व्यक्तिगत डेटा बेच्दैनौं। Feature चलाउन, कानुनी वा सुरक्षा दायित्व पूरा गर्न, platform operation गर्न, वा participant, expert, organizer र admin बीच आवश्यक communication गर्नुपर्दा मात्र जानकारी प्रयोग/साझा गरिन्छ।', 'Platform अहिले Nepal trail communities मा केन्द्रित छ। Region वा data practice materially change भएमा विस्तार अघि policy update गर्नुपर्छ।'] },
        { title: 'खाता हटाउने', items: ['वैकल्पिक कारणसहित deletion request पठाउनुहोस्।', 'हामी pending obligation र compliance requirement समीक्षा गर्छौं।', 'Request approved, rejected वा completed हुँदा email update आउँछ।'] },
        { title: 'सम्पर्क', body: ['Privacy सम्बन्धी प्रश्न footer support वा feedback flow मार्फत LocoXperts team लाई पठाउन सकिन्छ।'] },
      ],
    },
  },
  terms: {
    en: {
      metadata: { title: 'Terms & Conditions', description: 'Terms for using LocoXperts, including safety, content, expert, and community guidelines.' },
      hero: { eyebrow: 'Legal', title: 'Terms for using LocoXperts', description: 'These terms explain how the platform works and what users are responsible for.', updated: 'March 24, 2026', actions: [{ label: 'Read safety policy', href: '/safety' }, { label: 'Read privacy policy', href: '/privacy', variant: 'secondary' }] },
      sections: [
        { title: 'Platform role', body: ['LocoXperts helps people discover trails, connect with local experts, and join outdoor events. Experts and organizers are independent hosts unless explicitly stated otherwise.'] },
        { title: 'Safety and risk', body: ['Outdoor activities can involve injury, illness, route uncertainty, weather, traffic, wildlife, and equipment failure. You are responsible for your own safety decisions and preparedness.'] },
        { title: 'Accounts and verification', body: ['Verified status means the platform has reviewed certain details; it is not a guarantee of safety, outcome, or service quality.'] },
        { title: 'Trail and content accuracy', body: ['Trail data, maps, distance, elevation, difficulty labels, meeting points, and service details are provided as-is and can change. Verify locally before relying on a route.'] },
        { title: 'Events and payments', body: ['Event pricing is set by hosts or admins where applicable. Payment and QR flows may use third-party services and may change as platform workflows mature.'] },
        { title: 'Availability and changes', body: ['Features, policies, and these terms may change. We may suspend content or accounts that create legal, safety, trust, or abuse risk.'] },
        { title: 'Prohibited use', items: ['Do not misuse the platform to harm others, impersonate people, or spam.', 'Do not upload illegal, hateful, misleading, unsafe, or infringing content.', 'Do not attempt to disrupt the platform or access unauthorized data.'] },
      ],
    },
    ne: {
      metadata: { title: 'सर्तहरू', description: 'LocoXperts प्रयोग गर्दा लागू हुने सुरक्षा, content, expert र community guideline।' },
      hero: { eyebrow: 'कानुनी', title: 'LocoXperts प्रयोग गर्ने सर्तहरू', description: 'यी सर्तहरूले platform कसरी चल्छ र user को जिम्मेवारी के हो भन्ने कुरा बताउँछन्।', updated: 'March 24, 2026', actions: [{ label: 'सुरक्षा नीति पढ्नुहोस्', href: '/ne/safety' }, { label: 'गोपनीयता नीति पढ्नुहोस्', href: '/ne/privacy', variant: 'secondary' }] },
      sections: [
        { title: 'प्लेटफर्मको भूमिका', body: ['LocoXperts ले मानिसहरूलाई ट्रेल खोज्न, स्थानीय expert सँग connect गर्न र outdoor event मा join गर्न सहयोग गर्छ। स्पष्ट रूपमा नलेखिएसम्म expert र organizer स्वतन्त्र host हुन्।'] },
        { title: 'सुरक्षा र जोखिम', body: ['Outdoor activity मा चोट, बिरामी, route uncertainty, मौसम, traffic, wildlife र equipment failure जस्ता जोखिम हुन सक्छन्। आफ्नो safety decision र तयारीका लागि तपाईं आफैं जिम्मेवार हुनुहुन्छ।'] },
        { title: 'खाता र verification', body: ['Verified status भनेको platform ले केही विवरण समीक्षा गरेको हो; यो safety, outcome वा service quality को guarantee होइन।'] },
        { title: 'Trail र content accuracy', body: ['Trail data, maps, distance, elevation, difficulty labels, meeting points र service details as-is दिइन्छन् र बदलिन सक्छन्। Route मा भर पर्नुअघि local रूपमा verify गर्नुहोस्।'] },
        { title: 'Events र payments', body: ['Event pricing host वा admin ले set गर्छन्। Payment र QR flow third-party service प्रयोग गर्न सक्छन् र platform workflow mature हुँदै जाँदा change हुन सक्छन्।'] },
        { title: 'Availability र changes', body: ['Features, policies र यी terms change हुन सक्छन्। Legal, safety, trust वा abuse risk बनाउने content/account suspend गर्न सक्छौं।'] },
        { title: 'निषेधित प्रयोग', items: ['अरूलाई हानि गर्ने, impersonate गर्ने वा spam गर्ने गरी platform प्रयोग नगर्नुहोस्।', 'Illegal, hateful, misleading, unsafe वा infringing content upload नगर्नुहोस्।', 'Platform disrupt गर्न वा unauthorized data access गर्न प्रयास नगर्नुहोस्।'] },
      ],
    },
  },
  safety: {
    en: {
      metadata: { title: 'Safety Policy', description: 'How LocoXperts approaches safety and risk management for outdoor activities.' },
      hero: { eyebrow: 'Safety', title: 'Good trail days start with clear expectations.', description: 'Outdoor sports have real risk. LocoXperts reduces avoidable risk by making route context, host expectations, participant responsibilities, and safety reporting easier to understand.', updated: 'March 23, 2026', actions: [{ label: 'Browse trails', href: '/trails' }, { label: 'Read terms', href: '/terms', variant: 'secondary' }] },
      sections: [
        { title: 'Core principles', items: ['Safety first: pace, route, and decisions should prioritize the group.', 'Honesty: accurate fitness and experience prevents avoidable incidents.', 'Preparation: gear, water, timing, and route planning matter.', 'Respect: follow local rules, local communities, and Leave No Trace basics.'] },
        { title: 'Participant responsibilities', items: ['Bring sport-appropriate gear, including a helmet for cycling when required.', 'Carry enough water, food, layers, lights, and personal essentials.', 'Arrive on time so the group is not pushed into unsafe decisions.', 'Communicate if you feel unwell, unsafe, separated, or unsure about the route.'] },
        { title: 'Expert and host responsibilities', items: ['Communicate meeting point, timing, route expectations, difficulty, and required gear clearly.', 'Adapt the route when weather, access, visibility, trail conditions, or group readiness changes.', 'Have a basic incident plan, including exit points and local help.'] },
        { title: 'Weather, route changes, and cancellations', body: ['Conditions can change quickly. A host or platform admin may reschedule, shorten, reroute, or cancel an activity if storms, low visibility, access restrictions, or group readiness creates avoidable risk.'] },
        { title: 'Medical, emergencies, and insurance', items: ['Participants are responsible for their own health decisions.', 'Carry identification and an emergency contact when possible.', 'Use local emergency services first for urgent incidents.', 'Appropriate outdoor activity insurance is strongly recommended.'] },
      ],
    },
    ne: {
      metadata: { title: 'सुरक्षा नीति', description: 'Outdoor activity का लागि LocoXperts को safety र risk management दृष्टिकोण।' },
      hero: { eyebrow: 'सुरक्षा', title: 'राम्रो ट्रेल दिन स्पष्ट अपेक्षाबाट सुरु हुन्छ।', description: 'Outdoor sport मा वास्तविक जोखिम हुन्छ। LocoXperts ले route context, host expectation, participant responsibility र safety reporting बुझ्न सजिलो बनाएर avoidable risk घटाउन मद्दत गर्छ।', updated: 'March 23, 2026', actions: [{ label: 'ट्रेल हेर्नुहोस्', href: '/trails' }, { label: 'सर्तहरू पढ्नुहोस्', href: '/ne/terms', variant: 'secondary' }] },
      sections: [
        { title: 'मुख्य सिद्धान्त', items: ['Safety first: pace, route र decision ले group लाई प्राथमिकता दिनुपर्छ।', 'Honesty: सही fitness र experience जानकारीले avoidable incident घटाउँछ।', 'Preparation: gear, water, timing र route planning महत्वपूर्ण छन्।', 'Respect: local rule, community र Leave No Trace basics पालना गर्नुहोस्।'] },
        { title: 'Participant जिम्मेवारी', items: ['आवश्यक हुँदा cycling का लागि helmet सहित sport-appropriate gear ल्याउनुहोस्।', 'पर्याप्त पानी, खाना, layer, light र personal essentials बोक्नुहोस्।', 'Group लाई unsafe decision मा नधकेल्न समयमै आइपुग्नुहोस्।', 'अस्वस्थ, असुरक्षित, छुट्टिएको वा route बारे unsure भए communicate गर्नुहोस्।'] },
        { title: 'Expert र host जिम्मेवारी', items: ['Meeting point, timing, route expectation, difficulty र required gear स्पष्ट बताउनुहोस्।', 'मौसम, access, visibility, trail condition वा group readiness बदलिँदा route adapt गर्नुहोस्।', 'Exit point र local help सहित basic incident plan राख्नुहोस्।'] },
        { title: 'मौसम, route change र cancellation', body: ['Condition छिटो बदलिन सक्छ। Storm, low visibility, access restriction वा group readiness ले avoidable risk बनाएमा host वा platform admin ले activity reschedule, shorten, reroute वा cancel गर्न सक्छन्।'] },
        { title: 'Medical, emergency र insurance', items: ['Participant आफ्नो health decision का लागि आफैं जिम्मेवार हुन्छन्।', 'सम्भव भए identification र emergency contact बोक्नुहोस्।', 'Urgent incident मा पहिले local emergency service प्रयोग गर्नुहोस्।', 'उपयुक्त outdoor activity insurance strongly recommended छ।'] },
      ],
    },
  },
  'support-locoxperts': {
    en: {
      metadata: { title: 'Support LocoXperts', description: 'Support LocoXperts so the platform can stay alive and useful for local riders.' },
      hero: { eyebrow: 'Keep it running', title: 'Help keep LocoXperts alive.', description: 'If LocoXperts helps you find trails, experts, events, or nearby ride support, you can support the developer behind it.' },
      sections: [
        { title: 'Scan to support', body: ['Use the eSewa QR to support LocoXperts platform upkeep.'] },
        { title: 'What this supports', body: ['This is for platform upkeep: hosting, fixes, maintenance, and developer time to keep improving LocoXperts.', 'Trail-building donations are separate. Use campaign pages when you want to support a specific trail or organization.'] },
      ],
    },
    ne: {
      metadata: { title: 'LocoXperts सपोर्ट गर्नुहोस्', description: 'LocoXperts लाई जीवित, सुधारिएको र स्थानीय rider का लागि उपयोगी राख्न सहयोग गर्नुहोस्।' },
      hero: { eyebrow: 'चलिरहन सहयोग', title: 'LocoXperts लाई चलिरहन सहयोग गर्नुहोस्।', description: 'LocoXperts ले तपाईंलाई trail, expert, event वा ride support भेट्न मद्दत गर्छ भने, यसलाई बनाउने developer लाई support गर्न सक्नुहुन्छ।' },
      sections: [
        { title: 'सपोर्ट गर्न scan गर्नुहोस्', body: ['LocoXperts platform upkeep का लागि eSewa QR प्रयोग गर्नुहोस्।'] },
        { title: 'यसले के support गर्छ', body: ['यो platform upkeep का लागि हो: hosting, fixes, maintenance र LocoXperts सुधार्न developer time।', 'Trail-building donation अलग हो। कुनै specific trail वा organization support गर्न campaign page प्रयोग गर्नुहोस्।'] },
      ],
    },
  },
};
