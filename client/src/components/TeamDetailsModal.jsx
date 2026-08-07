import { FaTimes, FaShieldAlt, FaUsers } from 'react-icons/fa'
import { formatCurrency } from '../utils/formatCurrency'

function TeamDetailsModal({ team, players, onClose }) {
  if (!team) return null

  const roster = players.filter(
    (player) =>
      player.status === 'Sold' &&
      player.teamId === team.id
  )

  const spent = roster.reduce(
    (total, player) =>
      total + Number(player.soldPrice || 0),
    0
  )

  const remaining = Math.max(
    0,
    Number(team.startingBudget ?? 100000) - spent
  )

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
    >
      <section
        className="team-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <header>
          <div>
            <h2>{team.name}</h2>
            <p>Owner: {team.owner}</p>
          </div>

          <button
            className="icon-button"
            onClick={onClose}
          >
            <FaTimes />
          </button>
        </header>

        <div className="glass-card" style={{ marginBottom: 20 }}>
          <h3>
            <FaShieldAlt /> Remaining Budget
          </h3>

          <h2>{formatCurrency(remaining)}</h2>
        </div>

        <div className="glass-card">
          <h3>
            <FaUsers /> Players ({roster.length})
          </h3>

          {roster.length === 0 ? (
            <p>No players purchased yet.</p>
          ) : (
            roster.map((player) => (
              <div
                key={player.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 0',
                  borderBottom:
                    '1px solid rgba(255,255,255,.08)',
                }}
              >
                <div>
                  <strong>{player.nickname}</strong>
                  <br />
                  <small>{player.role}</small>
                </div>

                <strong>
                  {formatCurrency(player.soldPrice)}
                </strong>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  )
}

export default TeamDetailsModal