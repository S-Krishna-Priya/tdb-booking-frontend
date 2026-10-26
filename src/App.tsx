const PLANNED_PROBLEMS = [
  { id: 'P1', title: 'Slot list and booking form' },
  { id: 'P2', title: 'Shareable filters and URL state' },
  { id: 'P3', title: 'Safe booking submission and retry handling' },
  { id: 'P4', title: 'My bookings and cancellation' },
  { id: 'P5', title: 'Accessibility and Malayalam localization' },
]

function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Temple Darshan Booking
          </h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            Book darshan time slots at the temple — browse availability, reserve a slot, and
            manage your bookings.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
        <section
          aria-labelledby="status-heading"
          className="rounded-lg border border-amber-200 bg-amber-50 p-4 sm:p-6"
        >
          <h2 id="status-heading" className="text-base font-semibold text-amber-900">
            Setup in progress
          </h2>
          <p className="mt-2 text-sm text-amber-900">
            Booking features will be implemented in subsequent feature branches.
          </p>
        </section>

        <section aria-labelledby="planned-heading" className="mt-8">
          <h2 id="planned-heading" className="text-lg font-semibold">
            Planned work
          </h2>
          <ul className="mt-4 space-y-3">
            {PLANNED_PROBLEMS.map((problem) => (
              <li
                key={problem.id}
                className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:gap-3"
              >
                <span className="w-fit rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                  {problem.id}
                </span>
                <span className="text-sm text-slate-800">{problem.title}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="mx-auto max-w-3xl px-4 pb-8 sm:px-6">
        <p className="text-xs text-slate-500">
          Frontend coding assessment · uses a mock API, no backend required.
        </p>
      </footer>
    </div>
  )
}

export default App
