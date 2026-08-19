import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaCalendarAlt,
  FaCheck,
  FaChartLine,
  FaGavel,
  FaShieldAlt,
  FaTimes,
  FaUsers,
  FaTrophy,
} from 'react-icons/fa'
import toast from 'react-hot-toast'

import AdminModuleCard from '../components/AdminModuleCard'
import { useAuth } from '../context/AuthContext'
import { usePlayers } from '../context/PlayersContext'
import { useTeams } from '../context/TeamsContext'
import { useFixtures } from '../context/FixturesContext'
import { useAuction } from '../context/AuctionContext'
import { supabase } from '../lib/supabase'

const modules = [
  { title: 'Players', description: 'Create and manage player profiles.', icon: FaUsers, to: '/admin/players' },
  { title: 'Teams', description: 'Organize team rosters and credits.', icon: FaShieldAlt, to: '/teams' },
  { title: 'Auction', description: 'Control live bidding and player lots.', icon: FaGavel, to: '/auction' },
  { title: 'Fixtures', description: 'Schedule tournament matches.', icon: FaCalendarAlt, to: '/fixtures' },
  { title: 'Statistics', description: 'Review tournament performance.', icon: FaChartLine, to: '/stats' },
  { title: 'Playoffs', description: 'Manage brackets and champion.', icon: FaTrophy, to: '/playoffs' },
]

function Admin() {
  const { user, logout, isAdmin, isSuperAdmin, isTeamAdmin, teamId, adminProfile } = useAuth()
  const { players, addPlayer } = usePlayers()
  const { teams } = useTeams()
  const { fixtures } = useFixtures()
  const { auction } = useAuction()
  const navigate = useNavigate()

  const [registrations, setRegistrations] = useState([])
  const [teamAdmins, setTeamAdmins] = useState([])
  const [loadingRegistrations, setLoadingRegistrations] = useState(true)
  const [loadingAdmins, setLoadingAdmins] = useState(true)
  const [actionId, setActionId] = useState(null)
  const [adminEmail, setAdminEmail] = useState('')
  const [adminTeamId, setAdminTeamId] = useState('')

  const soldPlayers = players.filter((p) => p.status === 'Sold')
  const completedFixtures = fixtures.filter((f) => f.status === 'Completed')
  const pendingRegistrations = useMemo(
    () => registrations.filter((r) => String(r.status || '').toLowerCase() === 'pending'),
    [registrations]
  )

  const assignedTeam = teams.find((team) => team.id === teamId)
  const assignedPlayers = isTeamAdmin
    ? players.filter((p) => p.status === 'Sold' && p.teamId === teamId)
    : []
  const assignedSpent = assignedPlayers.reduce((sum, p) => sum + Number(p.soldPrice ?? p.basePrice ?? 0), 0)
  const assignedBudget = assignedTeam ? Number(assignedTeam.startingBudget ?? assignedTeam.budget ?? 100000) : 0
  const assignedRemaining = Math.max(0, assignedBudget - assignedSpent)
  const history = isTeamAdmin
    ? (auction?.history || []).filter((entry) => entry.teamId === teamId).slice(0, 10)
    : []

  const loadRegistrations = async () => {
    if (!isAdmin) return
    setLoadingRegistrations(true)
    const { data, error } = await supabase.from('player_registrations').select('*').order('created_at', { ascending: true })
    if (error) toast.error(error.message)
    setRegistrations(data || [])
    setLoadingRegistrations(false)
  }

  const loadTeamAdmins = async () => {
    if (!isSuperAdmin) return setLoadingAdmins(false)
    setLoadingAdmins(true)
    const { data, error } = await supabase
      .from('admin_users')
      .select('user_id, email, role, team_id, created_at, teams(id,name)')
      .eq('role', 'team_admin')
      .order('created_at', { ascending: true })
    if (error) toast.error(error.message)
    setTeamAdmins(data || [])
    setLoadingAdmins(false)
  }

  useEffect(() => { void loadRegistrations() }, [isAdmin])
  useEffect(() => { void loadTeamAdmins() }, [isSuperAdmin])

  const approvePlayer = async (registration) => {
    if (!isSuperAdmin || !registration?.id) return
    setActionId(registration.id)
    try {
      const player = await addPlayer({
        realName: registration.real_name || '',
        nickname: registration.nickname || '',
        age: registration.age ?? '',
        country: registration.country || '',
        photo: '', status: 'Unsold', teamId: '', basePrice: 0, soldPrice: 0,
      })
      if (!player?.id) throw new Error('Player was not created correctly.')

      const { error } = await supabase
        .from('player_registrations')
        .update({
          status: 'Approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id || null,
          admin_note: 'Approved and added to official Players list',
        })
        .eq('id', registration.id)
      if (error) throw error

      toast.success(`${registration.nickname || 'Player'} approved`)
      await loadRegistrations()
    } catch (error) {
      console.error('PLAYER APPROVAL ERROR:', error)
      toast.error(error?.message || 'Approval failed')
    } finally {
      setActionId(null)
    }
  }

  const rejectPlayer = async (registration) => {
    if (!isSuperAdmin || !registration?.id) return
    setActionId(registration.id)
    try {
      const { error } = await supabase
        .from('player_registrations')
        .update({ status: 'Rejected', reviewed_at: new Date().toISOString(), reviewed_by: user?.id || null, admin_note: 'Rejected by tournament admin' })
        .eq('id', registration.id)
      if (error) throw error
      toast.success(`${registration.nickname || 'Player'} rejected`)
      await loadRegistrations()
    } catch (error) {
      toast.error(error?.message || 'Failed to reject registration')
    } finally {
      setActionId(null)
    }
  }

  const addTeamAdmin = async (event) => {
    event.preventDefault()
    if (!isSuperAdmin) return
    if (!adminEmail.trim() || !adminTeamId) return toast.error('Enter email and select a team')
    try {
      const { error } = await supabase.rpc('admin_add_team_admin', { p_email: adminEmail.trim().toLowerCase(), p_team_id: adminTeamId })
      if (error) throw error
      toast.success('Team admin assigned successfully')
      setAdminEmail('')
      setAdminTeamId('')
      await loadTeamAdmins()
    } catch (error) {
      toast.error(error?.message || 'Failed to assign team admin')
    }
  }

  const removeTeamAdmin = async (admin) => {
    if (!isSuperAdmin || !admin?.user_id) return
    const { error } = await supabase.from('admin_users').delete().eq('user_id', admin.user_id)
    if (error) return toast.error(error.message)
    toast.success(`${admin.email} removed`)
    await loadTeamAdmins()
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <main className="admin-page">
      <section className="admin-hero glass-card">
        <div>
          <p className="eyebrow">SBT Major · Control Center</p>
          <h1>Admin Dashboard</h1>
          <p>Welcome back, {user?.email}. Manage the tournament from one place.</p>
        </div>
        <button className="logout-button" onClick={handleLogout}>Logout</button>
      </section>

      <section className="admin-stats-grid">
        <div className="glass-card admin-stat-card"><FaShieldAlt /><div><span>TEAMS</span><strong>{teams.length}</strong></div></div>
        <div className="glass-card admin-stat-card"><FaUsers /><div><span>PLAYERS SOLD</span><strong>{soldPlayers.length}</strong></div></div>
        <div className="glass-card admin-stat-card"><FaCalendarAlt /><div><span>MATCHES</span><strong>{fixtures.length}</strong></div></div>
        <div className="glass-card admin-stat-card"><FaTrophy /><div><span>COMPLETED</span><strong>{completedFixtures.length}</strong></div></div>
      </section>

      {isSuperAdmin && (
        <>
          <section className="admin-management-section">
            <div className="section-heading"><div><span className="eyebrow">ADMINISTRATION</span><h2>Team Admins</h2></div></div>
            <div className="admin-management-grid">
              <form className="admin-management-card glass-card" onSubmit={addTeamAdmin}>
                <span className="eyebrow">ASSIGN ACCESS</span><h3>Add Team Admin</h3>
                <label className="admin-management-field"><span>Admin Email</span><input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required /></label>
                <label className="admin-management-field"><span>Assigned Team</span><select value={adminTeamId} onChange={(e) => setAdminTeamId(e.target.value)} required><option value="">Select a team</option>{teams.map((team) => <option key={team.id} value={team.id}>{team.name}</option>)}</select></label>
                <button className="button button-primary" type="submit">Assign Team Admin</button>
              </form>

              <section className="admin-management-card glass-card">
                <span className="eyebrow">CURRENT ACCESS</span><h3>Assigned Team Admins</h3>
                {loadingAdmins ? <p>Loading…</p> : teamAdmins.length === 0 ? <p>No team admins assigned.</p> : teamAdmins.map((admin) => (
                  <div className="admin-management-row" key={admin.user_id}>
                    <div><strong>{admin.email}</strong><span>{admin.teams?.name || 'No team'}</span></div>
                    <button className="button button-secondary" type="button" onClick={() => removeTeamAdmin(admin)}><FaTimes /> Remove</button>
                  </div>
                ))}
              </section>
            </div>
          </section>

          <section className="admin-registration-section">
            <div className="section-heading"><div><span className="eyebrow">PLAYER REGISTRATION</span><h2>Pending Approvals</h2></div><strong>{pendingRegistrations.length}</strong></div>
            <div className="admin-registration-card glass-card">
              {loadingRegistrations ? <p>Loading registrations…</p> : pendingRegistrations.length === 0 ? (
                <div className="admin-registration-empty"><FaCheck /><strong>No pending registrations</strong></div>
              ) : pendingRegistrations.map((registration) => (
                <article className="admin-registration-row" key={registration.id}>
                  <div className="admin-registration-main">
                    <div className="admin-registration-avatar"><FaUsers /></div>
                    <div><div className="admin-registration-name">{registration.nickname || 'Unnamed Player'}</div><div className="admin-registration-meta">{registration.real_name || 'No name'} · {registration.country || 'Pakistan'} · {registration.age || '—'} · {registration.role || 'Player'}</div><div className="admin-registration-email">{registration.email}</div></div>
                  </div>
                  <div className="admin-registration-actions">
                    <button className="button button-primary" type="button" disabled={actionId === registration.id} onClick={() => approvePlayer(registration)}><FaCheck /> Approve</button>
                    <button className="button button-secondary" type="button" disabled={actionId === registration.id} onClick={() => rejectPlayer(registration)}><FaTimes /> Reject</button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}

      {isTeamAdmin && (
        <section className="team-admin-dashboard-section">
          <div className="section-heading"><div><span className="eyebrow">TEAM COMMAND</span><h2>My Team</h2></div></div>
          {assignedTeam ? (
            <>
              <section className="glass-card team-admin-hero"><div><span className="eyebrow">ASSIGNED TEAM</span><h3>{assignedTeam.name}</h3><p>{assignedTeam.owner || adminProfile?.email}</p></div><div><span>REMAINING BUDGET</span><strong>{assignedRemaining.toLocaleString()}</strong></div></section>
              <section className="team-admin-stats-grid"><div className="glass-card team-admin-stat"><span>PLAYERS BOUGHT</span><strong>{assignedPlayers.length}</strong></div><div className="glass-card team-admin-stat"><span>TOTAL SPENT</span><strong>{assignedSpent.toLocaleString()}</strong></div><div className="glass-card team-admin-stat"><span>TEAM BUDGET</span><strong>{assignedBudget.toLocaleString()}</strong></div><div className="glass-card team-admin-stat"><span>AUCTION ACTIVITY</span><strong>{history.length}</strong></div></section>
              <div className="team-admin-content-grid">
                <section className="glass-card team-admin-panel"><span className="eyebrow">YOUR ROSTER</span><h3>Players Bought</h3>{assignedPlayers.length === 0 ? <p>No players bought yet.</p> : assignedPlayers.map((p) => <div className="team-admin-player-row" key={p.id}><div><strong>{p.nickname}</strong><span>{p.role || 'Player'}</span></div><strong>{Number(p.soldPrice ?? p.basePrice ?? 0).toLocaleString()}</strong></div>)}</section>
                <section className="glass-card team-admin-panel"><span className="eyebrow">AUCTION ACTIVITY</span><h3>Latest Bids</h3>{history.length === 0 ? <p>No auction activity yet.</p> : history.map((entry) => <div className="team-admin-history-row" key={entry.id}><span>{entry.type === 'sale' ? 'SOLD' : 'BID'}</span><strong>{Number(entry.amount || 0).toLocaleString()}</strong></div>)}</section>
              </div>
            </>
          ) : <section className="glass-card team-admin-unassigned"><FaShieldAlt /><h3>No Team Assigned</h3><p>Ask the Super Admin to assign your team.</p></section>}
        </section>
      )}

      <section className="admin-modules-section"><div className="section-heading"><div><span className="eyebrow">MANAGEMENT</span><h2>Control Modules</h2></div></div><div className="admin-module-grid">{modules.map((module, index) => <AdminModuleCard key={module.title} {...module} index={index} />)}</div></section>
    </main>
  )
}

export default Admin
