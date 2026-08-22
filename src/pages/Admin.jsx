import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FaCalendarAlt,
  FaChartLine,
  FaCheck,
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
import { supabase } from '../lib/supabase'
import { useAuction } from '../context/AuctionContext'

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
  const {
    user,
    logout,
    isAdmin,
    isSuperAdmin,
    isTeamAdmin,
    teamId: assignedTeamId,
    adminProfile,
  } = useAuth()
  const { teams } = useTeams()
  const { players, addPlayer } = usePlayers()
  const { fixtures } = useFixtures()
  const { auction } = useAuction()
  const navigate = useNavigate()

  const [registrations, setRegistrations] = useState([])
  const [registrationsLoading, setRegistrationsLoading] = useState(true)
  const [actionId, setActionId] = useState(null)

  const [teamAdmins, setTeamAdmins] = useState([])
  const [teamAdminsLoading, setTeamAdminsLoading] = useState(true)
  const [adminEmail, setAdminEmail] = useState('')
  const [adminTeamId, setAdminTeamId] = useState('')
  const [adminActionLoading, setAdminActionLoading] = useState(false)

  const soldPlayers = players.filter(
    (player) => player.status === 'Sold'
  )

  const completedFixtures = fixtures.filter(
    (fixture) => fixture.status === 'Completed'
  )

  const upcomingFixtures = fixtures.filter(
    (fixture) => fixture.status !== 'Completed'
  )

  const assignedTeam = teams.find(
    (team) => team.id === assignedTeamId
  )

  const assignedTeamPlayers = isTeamAdmin
    ? players.filter(
        (player) =>
          player.status === 'Sold' &&
          player.teamId === assignedTeamId
      )
    : []

  const assignedTeamSpent = assignedTeamPlayers.reduce(
    (total, player) =>
      total +
      Number(
        player.soldPrice ??
          player.basePrice ??
          0
      ),
    0
  )

  const assignedTeamBudget = assignedTeam
    ? Number(
        assignedTeam.startingBudget ??
          assignedTeam.budget ??
          100000
      )
    : 0

  const assignedTeamRemaining = Math.max(
    0,
    assignedTeamBudget -
      assignedTeamSpent
  )

  const assignedTeamAuctionHistory =
    isTeamAdmin
      ? (auction?.history || [])
          .filter(
            (entry) =>
              entry.teamId ===
              assignedTeamId
          )
          .slice(0, 8)
      : []

  const pendingRegistrations = useMemo(
    () =>
      registrations.filter(
        (registration) =>
          String(registration.status || '').toLowerCase() ===
          'pending'
      ),
    [registrations]
  )

  const loadTeamAdmins = async () => {
    if (!isSuperAdmin) {
      setTeamAdmins([])
      setTeamAdminsLoading(false)
      return
    }

    setTeamAdminsLoading(true)

    try {
      const { data, error } = await supabase
        .from('admin_users')
        .select(`
          user_id,
          email,
          role,
          team_id,
          created_at,
          teams (
            id,
            name
          )
        `)
        .eq('role', 'team_admin')
        .order('created_at', { ascending: true })

      if (error) throw error

      setTeamAdmins(data || [])
    } catch (error) {
      console.error('TEAM ADMINS LOAD ERROR:', error)
      toast.error(
        error?.message || 'Failed to load team admins'
      )
    } finally {
      setTeamAdminsLoading(false)
    }
  }

  const addTeamAdmin = async (event) => {
    event.preventDefault()

    if (!isSuperAdmin) {
      toast.error('Only the Super Admin can add team admins')
      return
    }

    const email = adminEmail.trim().toLowerCase()
    const teamId = adminTeamId

    if (!email) {
      toast.error('Enter the admin email')
      return
    }

    if (!teamId) {
      toast.error('Select a team')
      return
    }

    setAdminActionLoading(true)

    try {
      const { error } = await supabase.rpc(
        'admin_add_team_admin',
        {
          p_email: email,
          p_team_id: teamId,
        }
      )

      if (error) throw error

      toast.success('Team admin assigned successfully')
      setAdminEmail('')
      setAdminTeamId('')
      await loadTeamAdmins()
    } catch (error) {
      console.error('TEAM ADMIN ADD ERROR:', error)
      toast.error(
        error?.message ||
          'Failed to assign team admin. Make sure the Auth account already exists.'
      )
    } finally {
      setAdminActionLoading(false)
    }
  }

  const removeTeamAdmin = async (admin) => {
    if (!isSuperAdmin || !admin?.user_id) return

    setAdminActionLoading(true)

    try {
      const { error } = await supabase
        .from('admin_users')
        .delete()
        .eq('user_id', admin.user_id)

      if (error) throw error

      toast.success(`${admin.email} removed from admin access`)
      await loadTeamAdmins()
    } catch (error) {
      console.error('TEAM ADMIN REMOVE ERROR:', error)
      toast.error(
        error?.message || 'Failed to remove team admin'
      )
    } finally {
      setAdminActionLoading(false)
    }
  }

  const loadRegistrations = async () => {
    if (!isAdmin) return

    setRegistrationsLoading(true)

    try {
      const { data, error } = await supabase
        .from('player_registrations')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error

      setRegistrations(data || [])
    } catch (error) {
      console.error('REGISTRATION LOAD ERROR:', error)
      toast.error(
        error?.message || 'Failed to load player registrations'
      )
    } finally {
      setRegistrationsLoading(false)
    }
  }

  useEffect(() => {
    loadRegistrations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin])

  useEffect(() => {
    loadTeamAdmins()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin])

  const approvePlayer = async (registration) => {
    if (!isAdmin || !registration?.id) return

    setActionId(registration.id)

    try {
      // 1) Create the official player from the registration.
      // Existing player fields are preserved and the player starts
      // as Unsold with a zero base price, ready for the auction.
      const newPlayer = await addPlayer({
        realName:
          registration.real_name ||
          registration.realName ||
          '',
        nickname:
          registration.nickname ||
          '',
        age:
          registration.age ??
          '',
        country:
          registration.country ||
          '',
        photo: '',
        status: 'Unsold',
        teamId: '',
        basePrice: 0,
        soldPrice: 0,
      })

      if (!newPlayer?.id) {
        throw new Error(
          'Player was not created correctly.'
        )
      }

      // 2) Mark the registration as approved only after
      // the official player record was created successfully.
      const { error } = await supabase
        .from('player_registrations')
        .update({
          status: 'Approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id || null,
          user_id: null,
          admin_note:
            'Approved and added to official Players list',
        })
        .eq('id', registration.id)

      if (error) {
        throw error
      }

      toast.success(
        `${registration.nickname || 'Player'} approved and added to Players`
      )

      await loadRegistrations()
    } catch (error) {
      console.error('PLAYER APPROVAL ERROR:', error)
      toast.error(
        error?.message ||
          'Approval failed. The player was not approved.'
      )
    } finally {
      setActionId(null)
    }
  }

  const rejectPlayer = async (registration) => {
    if (!isAdmin || !registration?.id) return

    setActionId(registration.id)

    try {
      const { error } = await supabase
        .from('player_registrations')
        .update({
          status: 'Rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id || null,
          admin_note:
            'Rejected by tournament admin',
        })
        .eq('id', registration.id)

      if (error) throw error

      toast.success(
        `${registration.nickname || 'Player'} rejected`
      )

      await loadRegistrations()
    } catch (error) {
      console.error('REGISTRATION REJECT ERROR:', error)
      toast.error(
        error?.message || 'Failed to reject registration'
      )
    } finally {
      setActionId(null)
    }
  }

  const handleLogout = async () => {
    await logout()
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
            Welcome back, {user?.username || user?.email}. Manage every
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

      <section className="admin-status-grid">
        <div className="glass-card admin-status-card">
          <span className="eyebrow">
            TOURNAMENT PROGRESS
          </span>

          <h2>
            {completedFixtures.length} / {fixtures.length}
          </h2>

          <p>matches completed</p>
        </div>

        <div className="glass-card admin-status-card">
          <span className="eyebrow">
            UPCOMING MATCHES
          </span>

          <h2>{upcomingFixtures.length}</h2>

          <p>matches remaining</p>
        </div>
      </section>


      {isSuperAdmin && (
        <section className="admin-management-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                ADMINISTRATION
              </span>

              <h2>Team Admins</h2>
            </div>

            <span className="admin-management-badge">
              SUPER ADMIN
            </span>
          </div>

          <div className="admin-management-grid">
            <form
              className="admin-management-card glass-card"
              onSubmit={addTeamAdmin}
            >
              <div className="admin-management-card-heading">
                <div>
                  <span className="eyebrow">
                    ASSIGN ACCESS
                  </span>
                  <h3>Add Team Admin</h3>
                </div>
              </div>

              <label className="admin-management-field">
                <span>Admin Email</span>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={(event) =>
                    setAdminEmail(event.target.value)
                  }
                  placeholder="teamowner@email.com"
                  autoComplete="off"
                  required
                />
              </label>

              <label className="admin-management-field">
                <span>Assigned Team</span>
                <select
                  value={adminTeamId}
                  onChange={(event) =>
                    setAdminTeamId(event.target.value)
                  }
                  required
                >
                  <option value="">
                    Select a team
                  </option>

                  {teams.map((team) => (
                    <option
                      key={team.id}
                      value={team.id}
                    >
                      {team.name}
                    </option>
                  ))}
                </select>
              </label>

              <p className="admin-management-note">
                The Auth account must already exist in
                Supabase. One team can have one Team Admin.
              </p>

              <button
                className="button button-primary"
                type="submit"
                disabled={adminActionLoading}
              >
                {adminActionLoading
                  ? 'Assigning…'
                  : 'Assign Team Admin'}
              </button>
            </form>

            <section className="admin-management-card glass-card">
              <div className="admin-management-card-heading">
                <div>
                  <span className="eyebrow">
                    CURRENT ACCESS
                  </span>
                  <h3>Assigned Team Admins</h3>
                </div>

                <span className="admin-management-total">
                  {teamAdmins.length}
                </span>
              </div>

              {teamAdminsLoading ? (
                <div className="admin-management-empty">
                  Loading team admins…
                </div>
              ) : teamAdmins.length === 0 ? (
                <div className="admin-management-empty">
                  No team admins assigned yet.
                </div>
              ) : (
                <div className="admin-management-list">
                  {teamAdmins.map((admin) => (
                    <article
                      className="admin-management-row"
                      key={admin.user_id}
                    >
                      <div>
                        <strong>
                          {admin.email}
                        </strong>

                        <span>
                          {admin.teams?.name ||
                            'No team assigned'}
                        </span>
                      </div>

                      <button
                        className="button button-secondary"
                        type="button"
                        disabled={adminActionLoading}
                        onClick={() =>
                          removeTeamAdmin(admin)
                        }
                      >
                        <FaTimes />
                        Remove
                      </button>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </section>
      )}

      {isSuperAdmin && (
        <section className="admin-registration-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">
              PLAYER REGISTRATION
            </span>

            <h2>Pending Approvals</h2>
          </div>

          <div className="admin-registration-count">
            {pendingRegistrations.length}
          </div>
        </div>

        <div className="admin-registration-card glass-card">
          {registrationsLoading ? (
            <div className="admin-registration-empty">
              Loading player registrations…
            </div>
          ) : pendingRegistrations.length === 0 ? (
            <div className="admin-registration-empty">
              <FaCheck />
              <strong>No pending registrations</strong>
              <span>
                New player applications will appear here automatically.
              </span>
            </div>
          ) : (
            <div className="admin-registration-list">
              {pendingRegistrations.map((registration) => {
                const isBusy = actionId === registration.id

                return (
                  <article
                    className="admin-registration-row"
                    key={registration.id}
                  >
                    <div className="admin-registration-main">
                      <div className="admin-registration-avatar">
                        <FaUsers />
                      </div>

                      <div>
                        <div className="admin-registration-name">
                          {registration.nickname || 'Unnamed Player'}

                          <span className="admin-registration-badge">
                            PENDING
                          </span>
                        </div>

                        <div className="admin-registration-meta">
                          {registration.real_name ||
                            registration.realName ||
                            'No real name'}
                          {' · '}
                          {registration.country || 'No country'}
                          {' · '}
                          {registration.age || '—'}
                          {' · '}
                          {registration.role || 'Player'}
                        </div>

                        <div className="admin-registration-email">
                          {registration.email || 'No email'}
                        </div>
                      </div>
                    </div>

                    <div className="admin-registration-actions">
                      <button
                        className="button button-primary"
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          approvePlayer(registration)
                        }
                      >
                        <FaCheck />
                        {isBusy ? 'Saving…' : 'Approve'}
                      </button>

                      <button
                        className="button button-secondary"
                        type="button"
                        disabled={isBusy}
                        onClick={() =>
                          rejectPlayer(registration)
                        }
                      >
                        <FaTimes />
                        Reject
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </div>
        </section>
      )}


      {isTeamAdmin && (
        <section className="team-admin-dashboard-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">
                TEAM COMMAND
              </span>

              <h2>My Team</h2>
            </div>

            <span className="team-admin-role-badge">
              TEAM ADMIN
            </span>
          </div>

          {assignedTeam ? (
            <>
              <section className="team-admin-hero glass-card">
                <div className="team-admin-team-identity">
                  <div className="team-admin-logo">
                    {assignedTeam.logo ? (
                      <img
                        src={assignedTeam.logo}
                        alt={`${assignedTeam.name} logo`}
                      />
                    ) : (
                      <FaShieldAlt />
                    )}
                  </div>

                  <div>
                    <span className="eyebrow">
                      ASSIGNED TEAM
                    </span>

                    <h3>{assignedTeam.name}</h3>

                    <p>
                      {assignedTeam.owner ||
                        adminProfile?.email ||
                        'Team Owner'}
                    </p>
                  </div>
                </div>

                <div className="team-admin-budget-highlight">
                  <span>REMAINING BUDGET</span>
                  <strong>
                    {assignedTeamRemaining.toLocaleString()}
                  </strong>
                  <small>
                    of {assignedTeamBudget.toLocaleString()}
                  </small>
                </div>
              </section>

              <section className="team-admin-stats-grid">
                <div className="glass-card team-admin-stat">
                  <span>PLAYERS BOUGHT</span>
                  <strong>{assignedTeamPlayers.length}</strong>
                </div>

                <div className="glass-card team-admin-stat">
                  <span>TOTAL SPENT</span>
                  <strong>
                    {assignedTeamSpent.toLocaleString()}
                  </strong>
                </div>

                <div className="glass-card team-admin-stat">
                  <span>TEAM BUDGET</span>
                  <strong>
                    {assignedTeamBudget.toLocaleString()}
                  </strong>
                </div>

                <div className="glass-card team-admin-stat">
                  <span>AUCTION ACTIVITY</span>
                  <strong>
                    {assignedTeamAuctionHistory.length}
                  </strong>
                </div>
              </section>

              <div className="team-admin-content-grid">
                <section className="glass-card team-admin-panel">
                  <div className="team-admin-panel-heading">
                    <div>
                      <span className="eyebrow">
                        YOUR ROSTER
                      </span>
                      <h3>Players Bought</h3>
                    </div>
                  </div>

                  {assignedTeamPlayers.length === 0 ? (
                    <div className="team-admin-empty">
                      No players bought yet.
                    </div>
                  ) : (
                    <div className="team-admin-player-list">
                      {assignedTeamPlayers.map((player) => (
                        <article
                          className="team-admin-player-row"
                          key={player.id}
                        >
                          <div>
                            <strong>{player.nickname}</strong>
                            <span>
                              {player.role || 'Player'}
                              {' · '}
                              {player.country || 'Pakistan'}
                            </span>
                          </div>

                          <strong>
                            {Number(
                              player.soldPrice ??
                                player.basePrice ??
                                0
                            ).toLocaleString()}
                          </strong>
                        </article>
                      ))}
                    </div>
                  )}
                </section>

                <section className="glass-card team-admin-panel">
                  <div className="team-admin-panel-heading">
                    <div>
                      <span className="eyebrow">
                        AUCTION ACTIVITY
                      </span>
                      <h3>Latest Bids</h3>
                    </div>
                  </div>

                  {assignedTeamAuctionHistory.length === 0 ? (
                    <div className="team-admin-empty">
                      No auction activity yet.
                    </div>
                  ) : (
                    <div className="team-admin-history-list">
                      {assignedTeamAuctionHistory.map((entry) => {
                        const player =
                          players.find(
                            (item) =>
                              item.id ===
                              entry.playerId
                          )

                        return (
                          <article
                            className="team-admin-history-row"
                            key={entry.id}
                          >
                            <div>
                              <span
                                className={
                                  entry.type ===
                                  'sale'
                                    ? 'team-admin-history-badge sale'
                                    : 'team-admin-history-badge'
                                }
                              >
                                {entry.type ===
                                'sale'
                                  ? 'SOLD'
                                  : 'BID'}
                              </span>

                              <strong>
                                {player?.nickname ||
                                  'Player'}
                              </strong>
                            </div>

                            <strong>
                              {Number(
                                entry.amount ||
                                  0
                              ).toLocaleString()}
                            </strong>
                          </article>
                        )
                      })}
                    </div>
                  )}
                </section>
              </div>

              <section className="team-admin-info glass-card">
                <span className="eyebrow">
                  AUCTION ACCESS
                </span>

                <p>
                  You can bid only for <strong>{assignedTeam.name}</strong>.
                  Player sales are finalized by the Super Admin.
                </p>
              </section>
            </>
          ) : (
            <section className="glass-card team-admin-unassigned">
              <FaShieldAlt />
              <h3>No Team Assigned</h3>
              <p>
                Your admin account is active, but the Super Admin has not
                assigned a team yet.
              </p>
            </section>
          )}
        </section>
      )}

      <section className="admin-modules-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">MANAGEMENT</span>
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

      <style>{`


        .team-admin-dashboard-section {
          margin-top: 24px;
        }

        .team-admin-dashboard-section .section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 14px;
        }

        .team-admin-role-badge {
          padding: 5px 8px;
          border: 1px solid rgba(255,48,72,.22);
          border-radius: 5px;
          color: #ff7180;
          background: rgba(255,48,72,.06);
          font-size: .5rem;
          font-weight: 900;
          letter-spacing: .09em;
        }

        .team-admin-hero {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 20px;
        }

        .team-admin-team-identity {
          display: flex;
          align-items: center;
          gap: 14px;
          min-width: 0;
        }

        .team-admin-logo {
          width: 64px;
          height: 64px;
          flex: 0 0 64px;
          display: grid;
          place-items: center;
          overflow: hidden;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,.08);
          color: #f3c747;
          background: rgba(243,199,71,.06);
          font-size: 1.5rem;
        }

        .team-admin-logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }

        .team-admin-team-identity h3 {
          margin: 5px 0 4px;
          color: #fff;
          font: 900 2rem/.95 'Barlow Condensed', sans-serif;
          text-transform: uppercase;
        }

        .team-admin-team-identity p {
          margin: 0;
          color: #858b94;
          font-size: .64rem;
        }

        .team-admin-budget-highlight {
          min-width: 190px;
          padding: 12px 14px;
          border: 1px solid rgba(243,199,71,.20);
          border-radius: 8px;
          background: rgba(243,199,71,.05);
          text-align: right;
        }

        .team-admin-budget-highlight span,
        .team-admin-budget-highlight small {
          display: block;
          color: #8d96a4;
          font-size: .52rem;
          font-weight: 900;
          letter-spacing: .08em;
        }

        .team-admin-budget-highlight strong {
          display: block;
          margin: 4px 0;
          color: #f3c747;
          font: 900 2rem/1 'Barlow Condensed', sans-serif;
        }

        .team-admin-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
          margin-top: 10px;
        }

        .team-admin-stat {
          padding: 14px;
        }

        .team-admin-stat span {
          display: block;
          color: #858b94;
          font-size: .52rem;
          font-weight: 900;
          letter-spacing: .07em;
        }

        .team-admin-stat strong {
          display: block;
          margin-top: 5px;
          color: #fff;
          font: 900 1.5rem/1 'Barlow Condensed', sans-serif;
        }

        .team-admin-content-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 10px;
        }

        .team-admin-panel {
          padding: 16px;
        }

        .team-admin-panel-heading {
          margin-bottom: 11px;
        }

        .team-admin-panel-heading h3 {
          margin: 4px 0 0;
          color: #fff;
          font: 800 1.35rem/1 'Barlow Condensed', sans-serif;
          text-transform: uppercase;
        }

        .team-admin-player-list,
        .team-admin-history-list {
          display: grid;
        }

        .team-admin-player-row,
        .team-admin-history-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 0;
          border-bottom: 1px solid rgba(255,255,255,.05);
        }

        .team-admin-player-row:last-child,
        .team-admin-history-row:last-child {
          border-bottom: 0;
        }

        .team-admin-player-row div,
        .team-admin-history-row div {
          min-width: 0;
        }

        .team-admin-player-row strong,
        .team-admin-player-row span {
          display: block;
        }

        .team-admin-player-row strong {
          color: #fff;
          font-size: .74rem;
        }

        .team-admin-player-row span {
          margin-top: 3px;
          color: #838a94;
          font-size: .59rem;
        }

        .team-admin-player-row > strong {
          color: #f3c747;
          font-size: .72rem;
          white-space: nowrap;
        }

        .team-admin-history-row div {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .team-admin-history-row strong {
          color: #dce1e9;
          font-size: .68rem;
        }

        .team-admin-history-row > strong {
          color: #f3c747;
        }

        .team-admin-history-badge {
          padding: 3px 5px;
          border: 1px solid rgba(112,157,235,.22);
          border-radius: 4px;
          color: #94b9ff;
          background: rgba(65,105,180,.07);
          font-size: .45rem;
          font-weight: 900;
          letter-spacing: .06em;
        }

        .team-admin-history-badge.sale {
          border-color: rgba(243,199,71,.24);
          color: #f3c747;
          background: rgba(243,199,71,.05);
        }

        .team-admin-empty {
          min-height: 100px;
          display: grid;
          place-items: center;
          color: #777d85;
          font-size: .65rem;
          text-align: center;
        }

        .team-admin-info {
          margin-top: 10px;
          padding: 13px 15px;
        }

        .team-admin-info p {
          margin: 5px 0 0;
          color: #818892;
          font-size: .62rem;
          line-height: 1.55;
        }

        .team-admin-info strong {
          color: #fff;
        }

        .team-admin-unassigned {
          min-height: 180px;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 7px;
          text-align: center;
        }

        .team-admin-unassigned svg {
          color: #f3c747;
          font-size: 1.5rem;
        }

        .team-admin-unassigned h3 {
          margin: 0;
          color: #fff;
          font: 800 1.5rem/1 'Barlow Condensed', sans-serif;
          text-transform: uppercase;
        }

        .team-admin-unassigned p {
          max-width: 430px;
          margin: 0;
          color: #7d838b;
          font-size: .65rem;
          line-height: 1.5;
        }

        .admin-management-section {
          margin-top: 24px;
        }

        .admin-management-section .section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 14px;
        }

        .admin-management-badge {
          padding: 5px 8px;
          border: 1px solid rgba(243,199,71,.25);
          border-radius: 5px;
          color: #f3c747;
          background: rgba(243,199,71,.05);
          font-size: .5rem;
          font-weight: 900;
          letter-spacing: .09em;
        }

        .admin-management-grid {
          display: grid;
          grid-template-columns: minmax(280px, .85fr) minmax(340px, 1.15fr);
          gap: 14px;
        }

        .admin-management-card {
          padding: 18px;
        }

        .admin-management-card-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
        }

        .admin-management-card-heading h3 {
          margin: 5px 0 0;
          color: #fff;
          font: 800 1.45rem/1 'Barlow Condensed', sans-serif;
          text-transform: uppercase;
        }

        .admin-management-total {
          display: grid;
          place-items: center;
          min-width: 34px;
          height: 34px;
          border-radius: 7px;
          border: 1px solid rgba(255,48,72,.18);
          color: #ff5368;
          background: rgba(255,48,72,.05);
          font-weight: 900;
        }

        .admin-management-field {
          display: grid;
          gap: 7px;
          margin-bottom: 12px;
        }

        .admin-management-field > span {
          color: #a8adb5;
          font-size: .59rem;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .admin-management-field input,
        .admin-management-field select {
          width: 100%;
          min-height: 42px;
          box-sizing: border-box;
          padding: 0 11px;
          border: 1px solid rgba(255,255,255,.08);
          border-radius: 6px;
          outline: 0;
          color: #fff;
          background: rgba(255,255,255,.02);
        }

        .admin-management-field input:focus,
        .admin-management-field select:focus {
          border-color: rgba(255,48,72,.34);
          box-shadow: 0 0 0 3px rgba(255,48,72,.06);
        }

        .admin-management-note {
          margin: 2px 0 13px;
          color: #757b83;
          font-size: .61rem;
          line-height: 1.5;
        }

        .admin-management-card > .button {
          width: 100%;
          justify-content: center;
        }

        .admin-management-list {
          display: grid;
          gap: 8px;
        }

        .admin-management-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 12px;
          border: 1px solid rgba(255,255,255,.06);
          border-radius: 8px;
          background: rgba(255,255,255,.015);
        }

        .admin-management-row > div {
          min-width: 0;
        }

        .admin-management-row strong,
        .admin-management-row span {
          display: block;
        }

        .admin-management-row strong {
          overflow: hidden;
          text-overflow: ellipsis;
          color: #fff;
          font-size: .72rem;
        }

        .admin-management-row span {
          margin-top: 4px;
          color: #858b94;
          font-size: .61rem;
        }

        .admin-management-row .button {
          flex: 0 0 auto;
          min-height: 36px;
          padding-inline: 10px;
        }

        .admin-management-empty {
          min-height: 130px;
          display: grid;
          place-items: center;
          color: #777d85;
          font-size: .67rem;
          text-align: center;
        }

        .admin-registration-section {
          margin-top: 24px;
        }

        .admin-registration-section .section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 14px;
        }

        .admin-registration-count {
          min-width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          padding: 0 10px;
          border-radius: 8px;
          border: 1px solid rgba(255,48,72,.28);
          color: #fff;
          background: rgba(255,48,72,.08);
          font-weight: 900;
        }

        .admin-registration-card {
          padding: 0;
          overflow: hidden;
        }

        .admin-registration-list {
          display: grid;
        }

        .admin-registration-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 16px 18px;
          border-bottom: 1px solid rgba(255,255,255,.06);
        }

        .admin-registration-row:last-child {
          border-bottom: 0;
        }

        .admin-registration-main {
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .admin-registration-avatar {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: grid;
          place-items: center;
          border-radius: 9px;
          border: 1px solid rgba(255,48,72,.18);
          color: #ff5368;
          background: rgba(255,48,72,.05);
        }

        .admin-registration-name {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          color: #fff;
          font-weight: 900;
          font-size: .84rem;
        }

        .admin-registration-badge {
          padding: 3px 6px;
          border-radius: 4px;
          border: 1px solid rgba(255,48,72,.20);
          color: #ff7180;
          background: rgba(255,48,72,.05);
          font-size: .48rem;
          letter-spacing: .08em;
        }

        .admin-registration-meta,
        .admin-registration-email {
          margin-top: 4px;
          color: #858b94;
          font-size: .64rem;
          line-height: 1.5;
        }

        .admin-registration-email {
          color: #a2a7ae;
        }

        .admin-registration-actions {
          display: flex;
          flex: 0 0 auto;
          gap: 8px;
        }

        .admin-registration-actions .button {
          min-height: 38px;
          padding-inline: 12px;
        }

        .admin-registration-empty {
          min-height: 170px;
          display: grid;
          place-items: center;
          align-content: center;
          gap: 7px;
          padding: 28px;
          text-align: center;
          color: #7d828a;
          font-size: .69rem;
        }

        .admin-registration-empty svg {
          color: #ff3048;
          font-size: 1.3rem;
        }

        .admin-registration-empty strong {
          color: #fff;
          font-size: .82rem;
        }

        @media (max-width: 900px) {
          .team-admin-stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .team-admin-content-grid {
            grid-template-columns: 1fr;
          }

          .team-admin-hero {
            align-items: stretch;
            flex-direction: column;
          }

          .team-admin-budget-highlight {
            width: 100%;
            box-sizing: border-box;
            text-align: left;
          }
        }

        @media (max-width: 720px) {
          .admin-registration-row {
            align-items: stretch;
            flex-direction: column;
          }

          .admin-registration-actions {
            width: 100%;
          }

          .admin-registration-actions .button {
            flex: 1;
            justify-content: center;
          }
        }
      `}</style>
    </main>
  )
}

export default Admin