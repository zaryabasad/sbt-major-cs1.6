import { FaShieldAlt, FaTimes, FaUsers } from 'react-icons/fa'
import { formatCurrency } from '../utils/formatCurrency'
import { useAuth } from '../context/AuthContext'

function TeamDetailsModal({ team, players = [], onClose, canViewBudget = false }) {
  const { isSuperAdmin } = useAuth()

  const roster = players.filter(
    (player) =>
      String(player.status || '').trim().toLowerCase() === 'sold' &&
      String(player.teamId ?? player.team_id ?? '') === String(team.id)
  )

  const getSoldPrice = (player) => {
    const value =
      player.soldPrice ??
      player.sold_price ??
      player.soldprice ??
      0

    const number = Number(value)
    return Number.isFinite(number) ? number : 0
  }

  const getPlayerName = (player) => {
    const name =
      player.realName ??
      player.real_name ??
      player.nickname ??
      player.playerName ??
      player.player_name ??
      player.name ??
      'Player'

    return String(name).trim() || 'Player'
  }

  const startingBudget = Number(
    team.startingBudget ??
    team.starting_budget ??
    team.budget ??
    100000
  )

  const spent = roster.reduce(
    (total, player) => total + getSoldPrice(player),
    0
  )

  const remainingBudget = Math.max(0, startingBudget - spent)

  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <section
        className="team-modal team-details-modal"
        role="dialog"
        aria-modal="true"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <p className="eyebrow">TEAM DETAILS</p>
            <h2>{team.name}</h2>
            <p>Owner: <strong>{team.owner}</strong></p>
          </div>

          <button className="icon-button" type="button" onClick={onClose} aria-label="Close">
            <FaTimes />
          </button>
        </header>

        <div className="team-detail-budget">
          <div>
            <FaShieldAlt />
            <strong>Remaining Budget</strong>
          </div>
          <h3>{canViewBudget ? formatCurrency(remainingBudget) : 'PRIVATE'}</h3>
        </div>

        <div className="team-detail-players">
          <h3>
            <FaUsers />
            {isSuperAdmin ? `Players (${roster.length})` : 'Players'}
          </h3>

          {!isSuperAdmin ? (
            <p className="empty-state-text">Player roster is private.</p>
          ) : roster.length === 0 ? (
            <p className="empty-state-text">No players purchased yet.</p>
          ) : (
            roster.map((player) => {
              const soldPrice = getSoldPrice(player)

              return (
                <div
                  className="team-player-row"
                  key={player.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '16px',
                    width: '100%',
                  }}
                >
                  <strong
                    style={{
                      display: 'block',
                      visibility: 'visible',
                      opacity: 1,
                      color: '#f7f4e9',
                      flex: '1 1 auto',
                    }}
                  >
                    {getPlayerName(player)}
                  </strong>
                  <strong style={{ flex: '0 0 auto' }}>
                    {canViewBudget ? formatCurrency(soldPrice) : 'PRIVATE'}
                  </strong>
                </div>
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}

export default TeamDetailsModal
