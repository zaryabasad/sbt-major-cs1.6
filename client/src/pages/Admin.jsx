import { useNavigate } from 'react-router-dom'
import { FaCalendarAlt, FaChartLine, FaGavel, FaShieldAlt, FaUsers } from 'react-icons/fa'
import AdminModuleCard from '../components/AdminModuleCard'
import { useAuth } from '../context/AuthContext'

const modules = [
  {
    title: 'Players',
    description: 'Create and manage player profiles.',
    icon: FaUsers,
    to: '/admin/players',
  },
  {
    title: 'Teams',
    description: 'Organize team rosters and credits.',
    icon: FaShieldAlt,
    to: '/teams',
  },
  {
    title: 'Auction',
    description: 'Control live bidding and player lots.',
    icon: FaGavel,
    to: '/auction',
  },
  {
    title: 'Fixtures',
    description: 'Schedule tournament matches.',
    icon: FaCalendarAlt,
    to: '/fixtures',
  },
  {
    title: 'Statistics',
    description: 'Review live tournament performance.',
    icon: FaChartLine,
    to: '/stats',
  },
]

function Admin() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <section className="admin-dashboard">
      <header className="admin-heading">
        <div>
          <p className="eyebrow">SBT Major · Control Center</p>
          <h1>Admin Dashboard</h1>
          <p>
            Welcome back, <strong>{user.username}</strong>.
            Manage every part of the tournament from one place.
          </p>
        </div>

        <button className="logout-button" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <div className="admin-module-grid">
        {modules.map((module, index) => (
          <AdminModuleCard
            key={module.title}
            {...module}
            index={index}
          />
        ))}
      </div>
    </section>
  )
}

export default Admin