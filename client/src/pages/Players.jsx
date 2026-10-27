import { useMemo, useState } from 'react'
import {
  FaEdit,
  FaPlus,
  FaSearch,
  FaTrash,
  FaUserNinja,
} from 'react-icons/fa'
import toast from 'react-hot-toast'

import ConfirmDialog from '../components/ConfirmDialog'
import PlayerModal from '../components/PlayerModal'
import { usePlayers } from '../context/PlayersContext'
import { useTeams } from '../context/TeamsContext'
import { useAuth } from '../context/AuthContext'
import { formatCurrency } from '../utils/formatCurrency'

const filters = ['All', 'Unsold', 'Sold']

function Players() {
  const { isAdmin, isSuperAdmin } = useAuth()
  const { players = [], addPlayer, updatePlayer, deletePlayer } = usePlayers()
  const { teams = [] } = useTeams()

  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [playerToDelete, setPlayerToDelete] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [saving, setSaving] = useState(false)

  const openCreate = () => {
    if (!isSuperAdmin) return
    setSelectedPlayer(null)
    setIsModalOpen(true)
  }

  const openEdit = (player) => {
    if (!isSuperAdmin) return
    setSelectedPlayer(player)
    setIsModalOpen(true)
  }

  const savePlayer = async (player) => {
    if (!isSuperAdmin) {
      toast.error('Only the Super Admin can manage players')
      return
    }
    if (saving) return

    try {
      setSaving(true)
      if (selectedPlayer) {
        await updatePlayer({ ...player, id: selectedPlayer.id })
        toast.success('Player updated successfully')
      } else {
        await addPlayer(player)
        toast.success('Player added successfully')
      }
      setIsModalOpen(false)
      setSelectedPlayer(null)
    } catch (error) {
      console.error('PLAYER SAVE ERROR:', error)
      toast.error(error?.message || 'Could not save player')
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!isSuperAdmin) {
      toast.error('Only the Super Admin can delete players')
      return
    }
    if (!playerToDelete?.id) return

    try {
      await deletePlayer(playerToDelete.id)
      toast.success(`${playerToDelete.nickname || 'Player'} deleted`)
      setPlayerToDelete(null)
    } catch (error) {
      console.error('PLAYER DELETE ERROR:', error)
      toast.error(error?.message || 'Could not delete player')
    }
  }

  const visiblePlayers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return players.filter((player) => {
      const realName = String(player?.realName || '').toLowerCase()
      const nickname = String(player?.nickname || '').toLowerCase()
      const matchesSearch = !query || realName.includes(query) || nickname.includes(query)
      const matchesStatus = statusFilter === 'All' || player?.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [players, searchTerm, statusFilter])

  const getTeamName = (teamId) => {
    if (!teamId) return ''
    const team = teams.find((item) => String(item.id) === String(teamId))
    return team?.name || ''
  }

  return (
    <section className="players-page">
      <style>{`
        .players-readonly-note {
          padding: 6px 9px;
          border: 1px solid rgba(112,157,235,.20);
          border-radius: 6px;
          color: #9eb7e6;
          background: rgba(65,105,180,.06);
          font-size: .56rem;
          font-weight: 900;
          letter-spacing: .08em;
          text-transform: uppercase;
          white-space: nowrap;
        }
      `}</style>

      <header className="teams-heading">
        <div>
          <p className="eyebrow">SBT Major · Auction Player Pool</p>
          <h1>Players Management</h1>
          <p>Build, search, and manage the players available for auction.</p>
        </div>

        {isAdmin && !isSuperAdmin && (
          <div className="players-readonly-note">Team Admin · Read Only</div>
        )}

        {isSuperAdmin && (
          <button className="button button-primary" onClick={openCreate} type="button">
            <FaPlus />
            Add Player
          </button>
        )}
      </header>

      {players.length === 0 ? (
        <section className="empty-teams glass-card">
          <FaUserNinja />
          <h2>No players added yet</h2>
          <p>Add players to create the tournament auction pool.</p>
          {isSuperAdmin && (
            <button className="button button-primary" onClick={openCreate} type="button">
              <FaPlus />
              Add First Player
            </button>
          )}
        </section>
      ) : (
        <>
          <section className="players-toolbar glass-card">
            <label className="player-search">
              <FaSearch />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by real name or nickname"
                aria-label="Search players"
              />
            </label>

            <div className="player-filters" aria-label="Filter players by status">
              {filters.map((status) => (
                <button
                  key={status}
                  type="button"
                  className={statusFilter === status ? 'active' : ''}
                  onClick={() => setStatusFilter(status)}
                >
                  {status}
                </button>
              ))}
            </div>
          </section>

          {visiblePlayers.length === 0 ? (
            <section className="no-player-results glass-card">
              <h2>No players found</h2>
              <p>Try a different search term or status filter.</p>
            </section>
          ) : (
            <div
              className="players-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '24px',
                width: '100%',
                alignItems: 'stretch',
              }}
            >
              {visiblePlayers.map((player, index) => {
                const teamName = getTeamName(player.teamId || player.team_id)
                const playerKey = player.id || `${player.nickname || 'player'}-${index}`

                return (
                  <article
                    className="player-card glass-card"
                    key={playerKey}
                    style={{ width: '100%', minWidth: 0, boxSizing: 'border-box' }}
                  >
                    <div className="player-image">
                      {player.photo ? (
                        <img
                          src={player.photo}
                          alt={player.realName || player.nickname || 'Player'}
                        />
                      ) : (
                        <FaUserNinja />
                      )}
                    </div>

                    <div className="player-card-content">
                      {isSuperAdmin && (
                        <div className="player-actions">
                          <button
                            type="button"
                            onClick={() => openEdit(player)}
                            aria-label={`Edit ${player.nickname || 'player'}`}
                          >
                            <FaEdit />
                          </button>
                          <button
                            type="button"
                            onClick={() => setPlayerToDelete(player)}
                            aria-label={`Delete ${player.nickname || 'player'}`}
                          >
                            <FaTrash />
                          </button>
                        </div>
                      )}

                      <div className="player-badges">
                        {player.role && <span className="role-badge">{player.role}</span>}
                        <span className={`status-badge status-${String(player.status || 'Unsold').toLowerCase()}`}>
                          {player.status || 'Unsold'}
                        </span>
                      </div>

                      <h2>{player.realName || 'Unnamed Player'}</h2>
                      <p className="player-nickname">@{player.nickname || 'unknown'}</p>
                      <p className="player-profile">
                        {player.country || 'Unknown'} · {player.age || '—'} years
                      </p>

                      <div className="player-meta">
                        {/* Team identity is intentionally private for every role except Super Admin. */}
                        <span>
                          {isSuperAdmin && player.status === 'Sold' && teamName
                            ? `Team: ${teamName}`
                            : 'Team: Private'}
                        </span>

                        <div>
                          <small>Base</small>
                          <strong>{formatCurrency(Number(player.basePrice || 0))}</strong>
                          {player.status === 'Sold' && (
                            <>
                              <br />
                              <small>Sold</small>
                              <strong style={{ color: '#f3c747' }}>
                                {formatCurrency(Number(player.soldPrice || 0))}
                              </strong>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </>
      )}

      {isSuperAdmin && isModalOpen && (
        <PlayerModal
          player={selectedPlayer}
          teams={teams}
          onClose={() => {
            if (!saving) {
              setIsModalOpen(false)
              setSelectedPlayer(null)
            }
          }}
          onSave={savePlayer}
        />
      )}

      {isSuperAdmin && playerToDelete && (
        <ConfirmDialog
          title="Delete this player?"
          message={`This will permanently remove ${playerToDelete.nickname || 'this player'} from the player pool.`}
          confirmLabel="Delete Player"
          onCancel={() => setPlayerToDelete(null)}
          onConfirm={confirmDelete}
        />
      )}
    </section>
  )
}

export default Players
