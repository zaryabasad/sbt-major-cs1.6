import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const navigation = [
  { label: 'Home', to: '/' },
  { label: 'Live Auction', to: '/auction' },
  { label: 'Group Chat', to: '/chat' },
  { label: 'Teams', to: '/teams' },
  { label: 'Players', to: '/players' },
  { label: 'Fixtures', to: '/fixtures' },
  { label: 'Playoffs', to: '/playoffs' },
  { label: 'Statistics', to: '/stats' },
  { label: 'Register as Player', to: '/player-register' },
]

function Header() {
  const { user, isTeamAdmin, isSuperAdmin } = useAuth()
  const canUseVoice = Boolean(user && (isTeamAdmin || isSuperAdmin))
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = () => setMenuOpen(false)

  const visibleNavigation = canUseVoice
    ? [...navigation, { label: 'Voice Chat', to: '/voice' }]
    : navigation

  return (
    <header className="site-header">
      <NavLink className="brand" to="/" onClick={closeMenu}>
        SBT <span>MAJOR</span>
      </NavLink>

      <div className={`mobile-nav-panel${menuOpen ? ' open' : ''}`}>
        <nav aria-label="Main navigation">
          {visibleNavigation.map(({ label, to }) => (
            <NavLink key={to} to={to} onClick={closeMenu}>
              {label}
            </NavLink>
          ))}
        </nav>
        <NavLink className="login-link" to="/login" onClick={closeMenu}>
          Admin Login
        </NavLink>
      </div>

      <div className="site-header-desktop-nav">
        <nav aria-label="Main navigation">
          {visibleNavigation.map(({ label, to }) => (
            <NavLink key={to} to={to}>
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      <NavLink className="login-link site-header-desktop-login" to="/login">
        Admin Login
      </NavLink>

      <button
        className="mobile-menu-button"
        type="button"
        aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((current) => !current)}
      >
        <span />
      </button>
    </header>
  )
}

export default Header
