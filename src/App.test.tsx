import { render, screen } from '@testing-library/react'
import App from './App'

describe('App', () => {
  it('renders the application title', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', { level: 1, name: /temple darshan booking/i }),
    ).toBeInTheDocument()
  })

  it('states that booking features are not implemented yet', () => {
    render(<App />)

    expect(
      screen.getByText(/booking features will be implemented in subsequent feature branches/i),
    ).toBeInTheDocument()
  })

  it('lists the five planned assessment problems', () => {
    render(<App />)

    const planned = screen.getByRole('heading', { level: 2, name: /planned work/i })
    const list = planned.parentElement?.querySelector('ul')

    expect(list).not.toBeNull()
    expect(list?.querySelectorAll('li')).toHaveLength(5)
  })
})
