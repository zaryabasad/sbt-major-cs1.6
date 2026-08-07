import { NavLink } from 'react-router-dom'

const navigation = [
  { label: 'Home', to: '/' },
  { label: 'Live Auction', to: '/auction' },
  { label: 'Teams', to: '/teams' },
  { label: 'Fixtures', to: '/fixtures' },
  { label: 'Playoffs', to: '/playoffs' },
  { label: 'Statistics', to: '/stats' },
]

function Header() {
  return (
    <header className="site-header">
      <NavLink className="brand" to="/">SBT <span>MAJOR</span></NavLink>
      <nav aria-label="Main navigation">
        {navigation.map(({ label, to }) => (
          <NavLink key={to} to={to}>{label}</NavLink>
        ))}
      </nav>
      <NavLink className="login-link" to="/login">Admin Login</NavLink>
    </header>
  )
}

export default Header
