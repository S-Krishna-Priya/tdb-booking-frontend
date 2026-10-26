import { useState } from 'react'
import { BookingPage } from './features/booking/BookingPage'
import { MyBookingsPage } from './features/bookings/MyBookingsPage'

type Section = 'book' | 'bookings'

const SECTIONS: readonly { id: Section; label: string }[] = [
  { id: 'book', label: 'Book a darshan' },
  { id: 'bookings', label: 'My bookings' },
]

function App() {
  const [section, setSection] = useState<Section>('book')

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <nav aria-label="Sections" className="border-b border-slate-200 bg-white">
        <ul className="mx-auto flex max-w-3xl gap-2 px-4 py-2 sm:px-6">
          {SECTIONS.map((item) => (
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

      {section === 'book' ? <BookingPage /> : <MyBookingsPage />}
    </div>
  )
}

export default App
