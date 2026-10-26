import { useState } from 'react'
import { LanguageSwitch } from './components/LanguageSwitch'
import { BookingPage } from './features/booking/BookingPage'
import { MyBookingsPage } from './features/bookings/MyBookingsPage'
import { useLanguage } from './i18n/context'
import { LanguageProvider } from './i18n/LanguageProvider'

type Section = 'book' | 'bookings'

function Shell() {
  const [section, setSection] = useState<Section>('book')
  const { language, t } = useLanguage()

  const sections: readonly { id: Section; label: string }[] = [
    { id: 'book', label: t.nav.book },
    { id: 'bookings', label: t.nav.bookings },
  ]

  return (
    // The subtree carries the chosen language as well as the document, so a screen reader reading
    // only part of the page still knows which language it is in.
    <div lang={language} className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-2 sm:px-6">
          <nav aria-label={t.nav.sections}>
            <ul className="flex gap-2">
              {sections.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-current={section === item.id ? 'page' : undefined}
                    onClick={() => {
                      setSection(item.id)
                    }}
                    className={`rounded-md px-3 py-2 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
                      section === item.id
                        ? 'bg-amber-100 text-amber-900'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          <LanguageSwitch />
        </div>
      </header>

      {section === 'book' ? <BookingPage /> : <MyBookingsPage />}
    </div>
  )
}

function App() {
  return (
    <LanguageProvider>
      <Shell />
    </LanguageProvider>
  )
}

export default App
