import { useState } from 'react'
import {
  FaEdit,
  FaPlus,
  FaShieldAlt,
  FaTrash,
  FaUsers,
} from 'react-icons/fa'

import toast from 'react-hot-toast'

import ConfirmDialog from '../components/ConfirmDialog'
import TeamModal from '../components/TeamModal'
import TeamDetailsModal from '../components/TeamDetailsModal'

import { usePlayers } from '../context/PlayersContext'
import { useTeams } from '../context/TeamsContext'

import { formatCurrency } from '../utils/formatCurrency'
function Teams() {
  const { teams, addTeam, updateTeam, deleteTeam } = useTeams()
const { players } = usePlayers()

const [selectedTeam, setSelectedTeam] = useState(null)
const [viewTeam, setViewTeam] = useState(null)

const [isModalOpen, setIsModalOpen] = useState(false)
const [teamToDelete, setTeamToDelete] = useState(null)
const openCreate = () => {
  setSelectedTeam(null)
  setIsModalOpen(true)
}

const openEdit = (team) => {
  setSelectedTeam(team)
  setIsModalOpen(true)
}

const saveTeam = (team) => {
  const normalizedName = team.name.trim().toLowerCase()

  const hasDuplicate = teams.some(
    (item) =>
      item.id !== team.id &&
      item.name.trim().toLowerCase() === normalizedName
  )

  if (hasDuplicate) {
    toast.error('A team with this name already exists')
    return
  }

  const normalizedTeam = {
    ...team,
    name: team.name.trim(),
    owner: team.owner.trim(),
  }

  if (selectedTeam) {
    updateTeam(normalizedTeam)
    toast.success('Team updated successfully')
  } else {
    addTeam(normalizedTeam)
    toast.success('Team created successfully')
  }

  setIsModalOpen(false)
}

const confirmDelete = () => {
  deleteTeam(teamToDelete.id)
  toast.success(`${teamToDelete.name} deleted`)
  setTeamToDelete(null)
}

const getRoster = (teamId) =>
  players.filter(
    (player) =>
      player.status === 'Sold' &&
      player.teamId === teamId
  )

  return <section className="teams-page"><header className="teams-heading"><div><p className="eyebrow">SBT Major · Tournament Roster</p><h1>Teams</h1><p>Build and manage every competing squad in the Major.</p></div><button className="button button-primary" onClick={openCreate}><FaPlus /> Create Team</button></header>{teams.length === 0 ? <section className="empty-teams glass-card"><FaShieldAlt /><h2>No teams created yet</h2><p>Add the first team to begin preparing the SBT MAJOR roster.</p><button className="button button-primary" onClick={openCreate}><FaPlus /> Create First Team</button></section> : <div className="teams-grid">{teams.map((team) => {
  const roster = getRoster(team.id)

  const remainingBudget = Math.max(
    0,
    Number(team.startingBudget ?? team.budget ?? 100000) -
      roster.reduce(
        (total, player) =>
          total + Number(player.soldPrice ?? player.basePrice ?? 0),
        0
      )
  )

  return (
    <article
      className="team-card glass-card"
      key={team.id}
      style={{ "--team-color": team.color }}
      onClick={() => setViewTeam(team)}
    >
      <div className="team-card-top">
        <div className="team-logo">
          {team.logo ? (
            <img
              src={team.logo}
              alt={`${team.name} logo`}
            />
          ) : (
            <FaShieldAlt />
          )}
        </div>

        <div className="team-actions">

          <button
            onClick={(e) => {
              e.stopPropagation()
              openEdit(team)
            }}
            aria-label={`Edit ${team.name}`}
          >
            <FaEdit />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation()
              setTeamToDelete(team)
            }}
            aria-label={`Delete ${team.name}`}
          >
            <FaTrash />
          </button>

        </div>
      </div>

      <h2>{team.name}</h2>

      <p className="team-owner">
        Owner:
        <strong> {team.owner}</strong>
      </p>

      <div className="team-details">

        <div>
          <span>Remaining Budget</span>
          <strong>
            {formatCurrency(remainingBudget)}
          </strong>
        </div>

        <div>
          <FaUsers />
          <span>Players</span>
          <strong>{roster.length}</strong>
        </div>

      </div>

    </article>
  )
})}
        </div>
        }

      {isModalOpen && (
          <TeamModal
            team={selectedTeam}
            onClose={() => setIsModalOpen(false)}
            onSave={saveTeam}
          />
        )}

        {teamToDelete && (
          <ConfirmDialog
            title="Delete this team?"
            message={`This will permanently remove ${teamToDelete.name} from the tournament roster.`}
            onCancel={() => setTeamToDelete(null)}
            onConfirm={confirmDelete}
          />
        )}

        {viewTeam && (
          <TeamDetailsModal
            team={viewTeam}
            players={players}
            onClose={() => setViewTeam(null)}
          />
        )}
      </section>
  
}

export default Teams
