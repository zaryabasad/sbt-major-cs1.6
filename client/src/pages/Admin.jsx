import { useNavigate } from 'react-router-dom'
import {
  FaCalendarAlt,
  FaChartLine,
  FaGavel,
  FaShieldAlt,
  FaUsers,
  FaTrophy,
} from 'react-icons/fa'

import AdminModuleCard from '../components/AdminModuleCard'
import { useAuth } from '../context/AuthContext'
import { usePlayers } from '../context/PlayersContext'
import { useTeams } from '../context/TeamsContext'
import { useFixtures } from '../context/FixturesContext'

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
  {
  title: 'Playoffs',
  description: 'Manage semi finals, grand final and champion.',
  icon: FaTrophy,
  to: '/playoffs',
},
]

function Admin() {
  const { user, logout } = useAuth()
  const { teams } = useTeams()
  const { players } = usePlayers()
  const { fixtures } = useFixtures()
  const navigate = useNavigate()

  const soldPlayers = players.filter(
    (player) => player.status === 'Sold'
  )

  const completedFixtures = fixtures.filter(
    (fixture) => fixture.status === 'Completed'
  )

  const upcomingFixtures = fixtures.filter(
    (fixture) => fixture.status !== 'Completed'
  )

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <main className="admin-page">
      <section className="admin-hero glass-card">
        <div>
          <p className="eyebrow">
            SBT Major · Control Center
          </p>

          <h1>Admin Dashboard</h1>

          <p>
            Welcome back, {user.username}. Manage every
            part of the tournament from one place.
          </p>
        </div>

        <button
          className="logout-button"
          onClick={handleLogout}
        >
          Logout
        </button>
      </section>

      {/* TOURNAMENT OVERVIEW */}

      <section className="admin-stats-grid">
        <div className="glass-card admin-stat-card">
          <FaShieldAlt />

          <div>
            <span>TEAMS</span>
            <strong>{teams.length}</strong>
          </div>
        </div>

        <div className="glass-card admin-stat-card">
          <FaUsers />

          <div>
            <span>PLAYERS SOLD</span>
            <strong>{soldPlayers.length}</strong>
          </div>
        </div>

        <div className="glass-card admin-stat-card">
          <FaCalendarAlt />

          <div>
            <span>MATCHES</span>
            <strong>{fixtures.length}</strong>
          </div>
        </div>

        <div className="glass-card admin-stat-card">
          <FaTrophy />

          <div>
            <span>COMPLETED</span>
            <strong>{completedFixtures.length}</strong>
          </div>
        </div>
      </section>

      {/* TOURNAMENT STATUS */}

      <section className="admin-status-grid">
        <div className="glass-card admin-status-card">
          <span className="eyebrow">
            TOURNAMENT PROGRESS
          </span>

          <h2>
            {completedFixtures.length} / {fixtures.length}
          </h2>

          <p>
            matches completed
          </p>
        </div>

        <div className="glass-card admin-status-card">
          <span className="eyebrow">
            UPCOMING MATCHES
          </span>

          <h2>
            {upcomingFixtures.length}
          </h2>

          <p>
            matches remaining
          </p>
        </div>
      </section>

      {/* ADMIN MODULES */}

      <section className="admin-modules-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              MANAGEMENT
            </span>

            <h2>Control Modules</h2>
          </div>
        </div>

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
    </main>
  )
}

export default Admin