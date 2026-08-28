/**
 * Multi-Language Localization Engine for CivicPulse / Swachh Bharat Governance Portal
 * Languages Supported:
 * - 'en': English (Default)
 * - 'hi': हिन्दी (Hindi)
 * - 'te': తెలుగు (Telugu)
 */

export type LanguageCode = 'en' | 'hi' | 'te';

export interface LanguageOption {
  code: LanguageCode;
  label: string;
  nativeLabel: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English' },
  { code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी' },
  { code: 'te', label: 'Telugu', nativeLabel: 'తెలుగు' }
];

export const TRANSLATIONS = {
  en: {
    // App & Core Titles
    appName: 'CivicPulse',
    appSubtitle: 'Autonomous Municipal Redressal & Smart Governance',
    govBadge: 'MoHUA Civic Tech Standard • Role-Protected & Encrypted',
    termsText: 'By continuing, you agree to the Municipal Service Charter and Grievance Redressal Terms.',
    
    // Core Actions & Navigation
    postAComplaint: 'Post a Complaint',
    myComplaints: 'My Complaints',
    sbmToiletLocator: 'SBM Toilet Locator',
    swachhSurvekshan: 'Swachh Survekshan',
    welcome: 'Welcome',
    assigned: 'Assigned',
    inProgress: 'In Progress',
    resolved: 'Resolved',
    submitGrievance: 'Submit Grievance',
    allTickets: 'All Complaints',
    openPending: 'Open / Pending',
    dispatched: 'Dispatched',
    home: 'Home',
    events: 'Cleanliness Drives',
    categories: 'Categories',
    profile: 'Profile',
    facilities: 'SBM Facilities',
    signIn: 'Sign In',
    signOut: 'Sign Out',
    switchRole: 'Switch Role',
    language: 'Language',
    selectLanguage: 'Select Language',
    settings: 'Preferences & Settings',
    
    // Search & Inputs
    searchPlaceholder: 'Search complaints, amenities, or ward...',
    describeIssuePlaceholder: 'Describe the civic sanitation or infrastructure issue...',
    landmarkPlaceholder: 'Nearest Landmark (e.g. Near Bus Stand, Main Market)',
    mobileNumber: 'Mobile Number',
    sendOtp: 'Send OTP',
    verifyAndSignIn: 'Verify & Sign In',
    continueWithGoogle: 'Continue with Google',
    changeNumber: 'Change Number',
    
    // Status & Roles
    citizen: 'Verified Citizen',
    fieldCrew: 'Field Contractor Crew',
    wardOfficer: 'Ward Officer',
    superAdmin: 'Master Super Admin',
    auditor: 'National Quality Auditor',
    volunteer: 'Swachhata Doot',
    
    // Feedback & Rating
    cleanlinessRating: 'Rate Cleanliness & Sanitation',
    feedbackRecorded: 'Feedback Recorded Successfully',
    karmaCredits: 'Karma Credits',
    
    // GIS & Officer Desk
    gisTacticalView: 'GIS Live Tactical View',
    wardTelemetry: 'Ward Live Telemetry & KPIs',
    incidentActionDesk: 'Incident Action Desk',
    dispatchCrew: 'Dispatch Field Crew',
    verifyResolution: 'Inspect, Verify Fix & Resolve Ticket',
    online: 'Online',
    offline: 'Offline'
  },
  hi: {
    // App & Core Titles
    appName: 'सिविक पल्स',
    appSubtitle: 'स्वायत्त नगर निगम निवारण एवं स्मार्ट शासन',
    govBadge: 'MoHUA मानक • सुरक्षित और भूमिका-संरक्षित',
    termsText: 'जारी रखकर, आप नगर निगम सेवा चार्टर और शिकायत निवारण शर्तों से सहमत होते हैं।',
    
    // Core Actions & Navigation
    postAComplaint: 'शिकायत दर्ज करें',
    myComplaints: 'मेरी शिकायतें',
    sbmToiletLocator: 'एसबीएम शौचालय खोजें',
    swachhSurvekshan: 'स्वच्छ सर्वेक्षण',
    welcome: 'स्वागत है',
    assigned: 'आवंटित',
    inProgress: 'प्रगति पर है',
    resolved: 'समाधान हुआ',
    submitGrievance: 'शिकायत सबमिट करें',
    allTickets: 'सभी शिकायतें',
    openPending: 'लंबित',
    dispatched: 'भेज दिया गया',
    home: 'होम',
    events: 'स्वच्छता अभियान',
    categories: 'श्रेणियां',
    profile: 'प्रोफ़ाइल',
    facilities: 'एसबीएम सुविधाएं',
    signIn: 'साइन इन करें',
    signOut: 'लॉग आउट',
    switchRole: 'भूमिका बदलें',
    language: 'भाषा',
    selectLanguage: 'भाषा चुनें',
    settings: 'प्राथमिकताएं एवं सेटिंग्स',
    
    // Search & Inputs
    searchPlaceholder: 'शिकायत, सुविधाएं या वार्ड खोजें...',
    describeIssuePlaceholder: 'नागरिक स्वच्छता या बुनियादी ढांचा समस्या का वर्णन करें...',
    landmarkPlaceholder: 'निकटतम लैंडमार्क (उदा. बस स्टैंड के पास, मुख्य बाजार)',
    mobileNumber: 'मोबाइल नंबर',
    sendOtp: 'ओटीपी भेजें',
    verifyAndSignIn: 'सत्यापित करें और साइन इन करें',
    continueWithGoogle: 'गूगल के साथ जारी रखें',
    changeNumber: 'नंबर बदलें',
    
    // Status & Roles
    citizen: 'सत्यापित नागरिक',
    fieldCrew: 'फील्ड क्रू यूनिट',
    wardOfficer: 'वार्ड अधिकारी',
    superAdmin: 'मास्टर सुपर एडमिन',
    auditor: 'राष्ट्रीय गुणवत्ता लेखा परीक्षक',
    volunteer: 'स्वच्छता दूत',
    
    // Feedback & Rating
    cleanlinessRating: 'स्वच्छता और सफाई का मूल्यांकन करें',
    feedbackRecorded: 'प्रतिक्रिया सफलतापूर्वक दर्ज की गई',
    karmaCredits: 'कर्म क्रेडिट्स',
    
    // GIS & Officer Desk
    gisTacticalView: 'जीआईएस लाइव कमांड दृश्य',
    wardTelemetry: 'वार्ड लाइव टेलीमेट्री एवं संकेतक',
    incidentActionDesk: 'शिकायत निवारण डेस्क',
    dispatchCrew: 'फील्ड टीम को भेजें',
    verifyResolution: 'निरीक्षण करें और टिकट बंद करें',
    online: 'ऑनलाइन',
    offline: 'ऑफ़लाइन'
  },
  te: {
    // App & Core Titles
    appName: 'సివిక్ పల్స్',
    appSubtitle: 'స్వయంప్రతిపత్తి మునిసిపల్ పరిష్కారం మరియు స్మార్ట్ పాలన',
    govBadge: 'MoHUA ప్రమాణం • ఎన్‌క్రిప్ట్ చేయబడిన రక్షణ',
    termsText: 'కొనసాగించడం ద్వారా, మీరు మునిసిపల్ సర్వీస్ చార్టర్ మరియు ఫిర్యాదుల పరిష్కార నిబంధనలను అంగీకరిస్తున్నారు.',
    
    // Core Actions & Navigation
    postAComplaint: 'ఫిర్యాదు నమోదు చేయండి',
    myComplaints: 'నా ఫిర్యాదులు',
    sbmToiletLocator: 'ఎస్.బి.ఎమ్ శౌచాలయ లొకేటర్',
    swachhSurvekshan: 'స్వచ్ఛ సర్వేక్షణ్',
    welcome: 'స్వాగతం',
    assigned: 'కేటాయించబడింది',
    inProgress: 'పురోగతిలో ఉంది',
    resolved: 'పరిష్కరించబడింది',
    submitGrievance: 'ఫిర్యాదు సమర్పించండి',
    allTickets: 'అన్ని ఫిర్యాదులు',
    openPending: 'పెండింగ్',
    dispatched: 'రవాణా చేయబడింది',
    home: 'హోమ్',
    events: 'స్వచ్ఛతా డ్రైవ్‌లు',
    categories: 'వర్గాలు',
    profile: 'ప్రొఫైల్',
    facilities: 'ఎస్.బి.ఎమ్ సౌకర్యాలు',
    signIn: 'సైన్ ఇన్ చేయండి',
    signOut: 'లాగ్ అవుట్',
    switchRole: 'పాత్ర మార్చండి',
    language: 'భాష',
    selectLanguage: 'భాషను ఎంచుకోండి',
    settings: 'ప్రాధాన్యతలు & సెట్టింగ్‌లు',
    
    // Search & Inputs
    searchPlaceholder: 'ఫిర్యాదులు, సౌకర్యాలు లేదా వార్డును శోధించండి...',
    describeIssuePlaceholder: 'పారిశుధ్య లేదా మౌలిక సదుపాయాల సమస్యను వివరించండి...',
    landmarkPlaceholder: 'సమీప మైలురాయి (ఉదా. బస్ స్టాండ్ దగ్గర, ప్రధాన బజార్)',
    mobileNumber: 'మొబైల్ నంబర్',
    sendOtp: 'ఓటీపీ పంపండి',
    verifyAndSignIn: 'ధృవీకరించి సైన్ ఇన్ చేయండి',
    continueWithGoogle: 'గూగుల్‌తో కొనసాగండి',
    changeNumber: 'నంబర్ మార్చండి',
    
    // Status & Roles
    citizen: 'ధృవీకరించబడిన పౌరుడు',
    fieldCrew: 'ఫీల్డ్ సిబ్బంది బృందం',
    wardOfficer: 'వార్డ్ అధికారి',
    superAdmin: 'మాస్టర్ సూపర్ అడ్మిన్',
    auditor: 'జాతీయ నాణ్యత ఆడిటర్',
    volunteer: 'స్వచ్ఛతా దూత',
    
    // Feedback & Rating
    cleanlinessRating: 'పరిశుభ్రత & పారిశుధ్యాన్ని రేట్ చేయండి',
    feedbackRecorded: 'అభిప్రాయం విజయవంతంగా నమోదు చేయబడింది',
    karmaCredits: 'కర్మ క్రెడిట్స్',
    
    // GIS & Officer Desk
    gisTacticalView: 'జి.ఐ.ఎస్ లైవ్ వ్యూ',
    wardTelemetry: 'వార్డ్ లైవ్ టెలిమెట్రీ & కౌంటర్లు',
    incidentActionDesk: 'ఫిర్యాదుల పరిష్కార డెస్క్',
    dispatchCrew: 'ఫీల్డ్ సిబ్బందిని పంపండి',
    verifyResolution: 'పరిశీలించి సమస్యను ముగించండి',
    online: 'ఆన్‌లైన్',
    offline: 'ఆఫ్‌లైన్'
  }
} as const;

export type TranslationKey = keyof typeof TRANSLATIONS.en;

const LANGUAGE_STORAGE_KEY = 'app_language';

/**
 * Retrieve current active language from localStorage
 */
export function getCurrentLanguage(): LanguageCode {
  try {
    const saved = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved === 'en' || saved === 'hi' || saved === 'te') {
      return saved;
    }
  } catch (e) {
    console.warn('Could not read language from localStorage:', e);
  }
  return 'en';
}

/**
 * Persist new language to localStorage and notify listeners
 */
export function setLanguage(lang: LanguageCode): void {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    window.dispatchEvent(new CustomEvent('language_changed', { detail: lang }));
  } catch (e) {
    console.warn('Could not persist language to localStorage:', e);
  }
}

/**
 * Retrieve translated string by key and optional language
 */
export function t(key: TranslationKey, lang?: LanguageCode): string {
  const currentLang = lang || getCurrentLanguage();
  const dictionary = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  return (dictionary as any)[key] || TRANSLATIONS.en[key] || key;
}
