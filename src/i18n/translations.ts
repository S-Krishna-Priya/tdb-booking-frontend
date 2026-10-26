/**
 * Interface text in English and Malayalam.
 *
 * A typed record rather than an i18n library: two languages and one bundle do not need a runtime
 * message compiler, a plural-rules engine or a loader, and the platform already provides the only
 * hard part — `Intl.DateTimeFormat` — through `src/utils/datetime.ts`. The shape is a type, so a
 * message added to one language and forgotten in the other fails the type check rather than
 * showing a key on screen.
 *
 * Strings with a value in them are functions, so the value's position in the sentence belongs to
 * the translation. Malayalam does not put a number where English does.
 *
 * Not translated here, deliberately:
 * - temple names, which come from the API as data;
 * - error text thrown by the API, which arrives on the error object.
 */

export type Language = 'en' | 'ml'

export const LANGUAGES: readonly Language[] = ['en', 'ml']

/**
 * The BCP 47 tag each language formats dates, times and numbers with. The language chooses the
 * formatting; the timezone stays `Asia/Kolkata` in every language.
 */
export const LOCALES: Record<Language, string> = { en: 'en-IN', ml: 'ml-IN' }

/** What each language calls itself, so the switch is readable to the person who needs it. */
export const LANGUAGE_NAMES: Record<Language, string> = { en: 'English', ml: 'മലയാളം' }

export function isLanguage(value: unknown): value is Language {
  return value === 'en' || value === 'ml'
}

export interface NavMessages {
  sections: string
  book: string
  bookings: string
}

export interface LanguageMessages {
  legend: string
}

export interface BookingMessages {
  title: string
  temple: string
  date: string
  loadingTemples: string
  loadingSlots: string
  retryTemples: string
  retrySlots: string
  noSlots: string
  availableSlots: string
  ticketsRemaining: (remaining: number, capacity: number) => string
  slotFull: string
  slotStarted: string
  yourDetails: string
  name: string
  phone: string
  tickets: string
  book: string
  booking: string
  selectSlot: string
  confirmation: (tickets: number, templeName: string, reference: string) => string
}

export interface ValidationMessages {
  nameRequired: string
  phoneRequired: string
  lookupPhoneRequired: string
  phoneInvalid: string
  ticketsRequired: string
  ticketsMinimum: string
  ticketsExceedRemaining: (remaining: number) => string
}

export interface BookingsMessages {
  title: string
  intro: string
  phone: string
  find: string
  finding: string
  idle: string
  loading: string
  retry: string
  empty: (phone: string) => string
  heading: (phone: string) => string
  date: string
  startTime: string
  tickets: string
  status: string
  confirmed: string
  cancelled: string
  cancel: string
  cancelFor: (templeName: string) => string
  confirmPrompt: (tickets: number, templeName: string, date: string, time: string) => string
  confirmCancel: string
  keepBooking: string
  startedReason: string
  timeZoneSuffix: string
}

export interface Messages {
  nav: NavMessages
  language: LanguageMessages
  booking: BookingMessages
  validation: ValidationMessages
  bookings: BookingsMessages
}

const EN: Messages = {
  nav: {
    sections: 'Sections',
    book: 'Book a darshan',
    bookings: 'My bookings',
  },
  language: {
    legend: 'Language',
  },
  booking: {
    title: 'Temple Darshan Booking',
    temple: 'Temple',
    date: 'Date',
    loadingTemples: 'Loading temples…',
    loadingSlots: 'Loading slots…',
    retryTemples: 'Retry loading temples',
    retrySlots: 'Retry loading slots',
    noSlots: 'No slots are available for this temple on this date.',
    availableSlots: 'Available slots',
    ticketsRemaining: (remaining, capacity) =>
      `${remaining} of ${capacity} tickets remaining`,
    slotFull: 'Full',
    slotStarted: 'Already started',
    yourDetails: 'Your details',
    name: 'Name',
    phone: 'Phone number',
    tickets: 'Number of tickets',
    book: 'Book',
    booking: 'Booking…',
    selectSlot: 'Select a slot to book.',
    confirmation: (tickets, templeName, reference) =>
      `Booked ${tickets} ticket${tickets === 1 ? '' : 's'} for ${templeName}. Booking reference ${reference}.`,
  },
  validation: {
    nameRequired: 'Enter the devotee name.',
    phoneRequired: 'Enter a phone number.',
    lookupPhoneRequired: 'Enter your phone number.',
    phoneInvalid: 'Enter a valid 10-digit phone number.',
    ticketsRequired: 'Enter the number of tickets.',
    ticketsMinimum: 'Enter at least one ticket.',
    ticketsExceedRemaining: (remaining) => `Only ${remaining} tickets remain in this slot.`,
  },
  bookings: {
    title: 'My bookings',
    intro: 'Enter the phone number you booked with. All times are shown in Indian Standard Time.',
    phone: 'Phone number',
    find: 'Find my bookings',
    finding: 'Finding…',
    idle: 'Your bookings will appear here once you look them up.',
    loading: 'Looking up your bookings…',
    retry: 'Retry the lookup',
    empty: (phone) => `No bookings found for ${phone}.`,
    heading: (phone) => `Bookings for ${phone}`,
    date: 'Date',
    startTime: 'Start time',
    tickets: 'Tickets',
    status: 'Status',
    confirmed: 'Confirmed',
    cancelled: 'Cancelled',
    cancel: 'Cancel booking',
    cancelFor: (templeName) => `Cancel booking for ${templeName}`,
    confirmPrompt: (tickets, templeName, date, time) =>
      `Cancel ${tickets} ticket${tickets === 1 ? '' : 's'} for ${templeName} on ${date} at ${time} IST? This cannot be undone.`,
    confirmCancel: 'Yes, cancel booking',
    keepBooking: 'Keep booking',
    startedReason: 'This slot has already started, so this booking can no longer be cancelled.',
    timeZoneSuffix: 'IST',
  },
}

const ML: Messages = {
  nav: {
    sections: 'വിഭാഗങ്ങൾ',
    book: 'ദർശനം ബുക്ക് ചെയ്യുക',
    bookings: 'എന്റെ ബുക്കിംഗുകൾ',
  },
  language: {
    legend: 'ഭാഷ',
  },
  booking: {
    title: 'ക്ഷേത്ര ദർശന ബുക്കിംഗ്',
    temple: 'ക്ഷേത്രം',
    date: 'തീയതി',
    loadingTemples: 'ക്ഷേത്രങ്ങൾ ലോഡ് ചെയ്യുന്നു…',
    loadingSlots: 'സമയക്രമങ്ങൾ ലോഡ് ചെയ്യുന്നു…',
    retryTemples: 'ക്ഷേത്രങ്ങൾ വീണ്ടും ലോഡ് ചെയ്യുക',
    retrySlots: 'സമയക്രമങ്ങൾ വീണ്ടും ലോഡ് ചെയ്യുക',
    noSlots: 'ഈ തീയതിയിൽ ഈ ക്ഷേത്രത്തിൽ സമയക്രമങ്ങളൊന്നും ലഭ്യമല്ല.',
    availableSlots: 'ലഭ്യമായ സമയക്രമങ്ങൾ',
    ticketsRemaining: (remaining, capacity) =>
      `${capacity}-ൽ ${remaining} ടിക്കറ്റ് ശേഷിക്കുന്നു`,
    slotFull: 'നിറഞ്ഞു',
    slotStarted: 'ഇതിനകം ആരംഭിച്ചു',
    yourDetails: 'നിങ്ങളുടെ വിവരങ്ങൾ',
    name: 'പേര്',
    phone: 'ഫോൺ നമ്പർ',
    tickets: 'ടിക്കറ്റുകളുടെ എണ്ണം',
    book: 'ബുക്ക് ചെയ്യുക',
    booking: 'ബുക്ക് ചെയ്യുന്നു…',
    selectSlot: 'ബുക്ക് ചെയ്യാൻ ഒരു സമയക്രമം തിരഞ്ഞെടുക്കുക.',
    confirmation: (tickets, templeName, reference) =>
      `${templeName} എന്ന ക്ഷേത്രത്തിലേക്ക് ${tickets} ടിക്കറ്റ് ബുക്ക് ചെയ്തു. ബുക്കിംഗ് റഫറൻസ് ${reference}.`,
  },
  validation: {
    nameRequired: 'ഭക്തന്റെ പേര് നൽകുക.',
    phoneRequired: 'ഫോൺ നമ്പർ നൽകുക.',
    lookupPhoneRequired: 'നിങ്ങളുടെ ഫോൺ നമ്പർ നൽകുക.',
    phoneInvalid: 'സാധുവായ 10 അക്ക ഫോൺ നമ്പർ നൽകുക.',
    ticketsRequired: 'ടിക്കറ്റുകളുടെ എണ്ണം നൽകുക.',
    ticketsMinimum: 'കുറഞ്ഞത് ഒരു ടിക്കറ്റെങ്കിലും നൽകുക.',
    ticketsExceedRemaining: (remaining) =>
      `ഈ സമയക്രമത്തിൽ ${remaining} ടിക്കറ്റ് മാത്രമേ ശേഷിക്കുന്നുള്ളൂ.`,
  },
  bookings: {
    title: 'എന്റെ ബുക്കിംഗുകൾ',
    intro:
      'നിങ്ങൾ ബുക്ക് ചെയ്ത ഫോൺ നമ്പർ നൽകുക. എല്ലാ സമയങ്ങളും ഇന്ത്യൻ സ്റ്റാൻഡേർഡ് സമയത്തിലാണ് കാണിക്കുന്നത്.',
    phone: 'ഫോൺ നമ്പർ',
    find: 'എന്റെ ബുക്കിംഗുകൾ കണ്ടെത്തുക',
    finding: 'കണ്ടെത്തുന്നു…',
    idle: 'നിങ്ങൾ തിരഞ്ഞ ശേഷം ബുക്കിംഗുകൾ ഇവിടെ കാണാം.',
    loading: 'നിങ്ങളുടെ ബുക്കിംഗുകൾ തിരയുന്നു…',
    retry: 'വീണ്ടും തിരയുക',
    empty: (phone) => `${phone} എന്ന നമ്പറിൽ ബുക്കിംഗുകളൊന്നും കണ്ടെത്തിയില്ല.`,
    heading: (phone) => `${phone} എന്ന നമ്പറിലെ ബുക്കിംഗുകൾ`,
    date: 'തീയതി',
    startTime: 'ആരംഭ സമയം',
    tickets: 'ടിക്കറ്റുകൾ',
    status: 'നില',
    confirmed: 'സ്ഥിരീകരിച്ചു',
    cancelled: 'റദ്ദാക്കി',
    cancel: 'ബുക്കിംഗ് റദ്ദാക്കുക',
    cancelFor: (templeName) => `${templeName} എന്ന ക്ഷേത്രത്തിലെ ബുക്കിംഗ് റദ്ദാക്കുക`,
    confirmPrompt: (tickets, templeName, date, time) =>
      `${date}-ന് ${time} IST-ന് ${templeName} എന്ന ക്ഷേത്രത്തിലെ ${tickets} ടിക്കറ്റ് റദ്ദാക്കണോ? ഇത് പഴയപടിയാക്കാനാകില്ല.`,
    confirmCancel: 'അതെ, ബുക്കിംഗ് റദ്ദാക്കുക',
    keepBooking: 'ബുക്കിംഗ് നിലനിർത്തുക',
    startedReason: 'ഈ സമയക്രമം ഇതിനകം ആരംഭിച്ചതിനാൽ ഈ ബുക്കിംഗ് ഇനി റദ്ദാക്കാനാകില്ല.',
    timeZoneSuffix: 'IST',
  },
}

export const MESSAGES: Record<Language, Messages> = { en: EN, ml: ML }
