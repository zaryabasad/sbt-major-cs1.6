import { useMemo, useState } from 'react'
import { FaEdit, FaPlus, FaSearch, FaTrash, FaUserNinja } from 'react-icons/fa'
import toast from 'react-hot-toast'
import ConfirmDialog from '../components/ConfirmDialog'
import PlayerModal from '../components/PlayerModal'
import { usePlayers } from '../context/PlayersContext'
import { useTeams } from '../context/TeamsContext'
import { formatCurrency } from '../utils/formatCurrency'

const filters = ['All', 'Unsold', 'Sold']

function Players() {
  const { players, addPlayer, updatePlayer, deletePlayer } = usePlayers()
  const { teams } = useTeams()
  const [selectedPlayer, setSelectedPlayer] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [playerToDelete, setPlayerToDelete] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')

  const openCreate = () => { setSelectedPlayer(null); setIsModalOpen(true) }
  const openEdit = (player) => { setSelectedPlayer(player); setIsModalOpen(true) }
  const savePlayer = (player) => {
    if (selectedPlayer) { updatePlayer(player); toast.success('Player updated successfully') } else { addPlayer(player); toast.success('Player added successfully') }
    setIsModalOpen(false)
  }
  const confirmDelete = () => { deletePlayer(playerToDelete.id); toast.success(`${playerToDelete.nickname} deleted`); setPlayerToDelete(null) }
  const visiblePlayers = useMemo(() => {
    const query = searchTerm.trim().toLowerCase()
    return players.filter((player) => (!query || player.realName.toLowerCase().includes(query) || player.nickname.toLowerCase().includes(query)) && (statusFilter === 'All' || player.status === statusFilter))
  }, [players, searchTerm, statusFilter])
  const getTeamName = (teamId) => teams.find((team) => team.id === teamId)?.name

  return (
    <section className="players-page">
      <header className="teams-heading">
        <div><p className="eyebrow">SBT Major · Auction Player Pool</p><h1>Players Management</h1><p>Build, search, and manage the players available for auction.</p></div>
        <button className="button button-primary" onClick={openCreate}><FaPlus /> Add Player</button>
      </header>

      {players.length === 0 ? (
        <section className="empty-teams glass-card"><FaUserNinja /><h2>No players added yet</h2><p>Add players to create the tournament auction pool.</p><button className="button button-primary" onClick={openCreate}><FaPlus /> Add First Player</button></section>
      ) : (
        <>
          <section className="players-toolbar glass-card">
            <label className="player-search"><FaSearch /><input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Search by real name or nickname" aria-label="Search players" /></label>
            <div className="player-filters" aria-label="Filter players by status">{filters.map((status) => <button className={statusFilter === status ? 'active' : ''} type="button" onClick={() => setStatusFilter(status)} key={status}>{status}</button>)}</div>
          </section>
          {visiblePlayers.length === 0 ? (
            <section className="no-player-results glass-card"><h2>No players found</h2><p>Try a different search term or status filter.</p></section>
          ) : (
            <div className="players-grid">
              {visiblePlayers.map((player) => <article className="player-card glass-card" key={player.id}>
                <div className="player-image">{player.photo ? <img src={player.photo} alt={player.realName} /> : <FaUserNinja />}</div>
                <div className="player-card-content">
                  <div className="player-actions"><button onClick={() => openEdit(player)} aria-label={`Edit ${player.nickname}`}><FaEdit /></button><button onClick={() => setPlayerToDelete(player)} aria-label={`Delete ${player.nickname}`}><FaTrash /></button></div>
                  <div className="player-badges"><span className="role-badge">{player.role}</span><span className={`status-badge status-${player.status.toLowerCase()}`}>{player.status}</span></div>
                  <h2>{player.realName}</h2><p className="player-nickname">@{player.nickname}</p><p className="player-profile">{player.country} · {player.age} years</p>
                  <div className="player-meta">
  <span>
    {player.status === 'Sold' && getTeamName(player.teamId)
      ? `Team: ${getTeamName(player.teamId)}`
      : 'Unassigned'}
  </span>

  <div>
    <small>Base</small>
    <strong>{formatCurrency(player.basePrice)}</strong>

    {player.status === 'Sold' && (
      <>
        <br />
        <small>Sold</small>
        <strong style={{ color: '#f3c747' }}>
          {formatCurrency(player.soldPrice || 0)}
        </strong>
      </>
    )}
  </div>
</div>
                </div>
              </article>)}
            </div>
          )}
        </>
      )}

      {isModalOpen && <PlayerModal player={selectedPlayer} teams={teams} onClose={() => setIsModalOpen(false)} onSave={savePlayer} />}
      {playerToDelete && <ConfirmDialog title="Delete this player?" message={`This will permanently remove ${playerToDelete.nickname} from the player pool.`} confirmLabel="Delete Player" onCancel={() => setPlayerToDelete(null)} onConfirm={confirmDelete} />}
    </section>
  )
}

export default Players
