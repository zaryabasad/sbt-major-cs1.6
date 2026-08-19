import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { FaBell } from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'
import { useNotifications } from '../context/NotificationContext'

const navigation = [
  { label: 'Home', to: '/' },
  { label: 'Live Auction', to: '/auction' },
  { label: 'Live Chat', to: '/chat' },
  { label: 'Teams', to: '/teams' },
  { label: 'Players', to: '/players' },
  { label: 'Fixtures', to: '/fixtures' },
  { label: 'Playoffs', to: '/playoffs' },
  { label: 'Statistics', to: '/stats' },
]

function Header() {
  const { user, isTeamAdmin, isSuperAdmin, isPlayer } = useAuth()
  const { unreadCount } = useNotifications() || { unreadCount: 0 }
  const canUseVoice = Boolean(user && (isTeamAdmin || isSuperAdmin))
  const [menuOpen, setMenuOpen] = useState(false)

  const closeMenu = () => setMenuOpen(false)

  const visibleNavigation = [
    ...navigation,
    ...(canUseVoice ? [{ label: 'Voice Chat', to: '/voice' }] : []),
    ...(isPlayer ? [{ label: 'Notifications', to: '/notifications' }] : []),
  ]

  return (
    <header className="site-header">
      <NavLink className="brand" to="/" onClick={closeMenu}>
        SBT <span>MAJOR</span>
      </NavLink>

      <div className={`mobile-nav-panel${menuOpen ? ' open' : ''}`}>
        <nav aria-label="Main navigation">
          {visibleNavigation.map(({ label, to }) => (
            <NavLink key={to} to={to} onClick={closeMenu}>
              {label}{label === 'Notifications' && unreadCount > 0 ? ` (${unreadCount})` : ''}
            </NavLink>
          ))}
        </nav>

        {!user && <NavLink className="login-link" to="/player-login" onClick={closeMenu}>Player Login</NavLink>}
        <NavLink className="login-link" to="/login" onClick={closeMenu}>Admin Login</NavLink>
      </div>

      <div className="site-header-desktop-nav">
        <nav aria-label="Main navigation">
          {visibleNavigation.map(({ label, to }) => (
            <NavLink key={to} to={to}>
              {label}{label === 'Notifications' && unreadCount > 0 ? ` (${unreadCount})` : ''}
            </NavLink>
          ))}
        </nav>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {isPlayer && (
          <NavLink className="login-link" to="/notifications" aria-label="Player notifications">
            <FaBell /> {unreadCount > 0 ? unreadCount : ''}
          </NavLink>
        )}
        {!user && <NavLink className="login-link site-header-desktop-login" to="/player-login">Player Login</NavLink>}
        <NavLink className="login-link site-header-desktop-login" to="/login">Admin Login</NavLink>
      </div>

      <button className="mobile-menu-button" type="button" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen((current) => !current)}>
        <span />
      </button>
    </header>
  )
}

export default Header
