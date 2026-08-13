import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

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
  const { user } = useAuth()
  const { players } = usePlayers()

  const isAdmin = Boolean(user)

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

  const saveTeam = async (team) => {
    const normalizedName = team.name.trim().toLowerCase()

    const hasDuplicate = teams.some(
      (item) =>
        item.id !== team.id &&
        item.name?.trim().toLowerCase() === normalizedName
    )

    if (hasDuplicate) {
      toast.error('A team with this name already exists')
      return
    }

    const normalizedTeam = {
      ...team,
      name: team.name.trim(),
      owner: team.owner.trim(),
      startingBudget: Number(
        team.startingBudget ??
        team.starting_budget ??
        team.budget ??
        100000
      ),
    }

    console.log('SAVE TEAM CALLED:', normalizedTeam)

    try {
      if (selectedTeam) {
        await updateTeam(normalizedTeam)
        toast.success('Team updated successfully')
      } else {
        await addTeam(normalizedTeam)
        toast.success('Team created successfully')
      }

      setIsModalOpen(false)
    } catch (error) {
      console.error('SAVE TEAM ERROR:', error)
      toast.error(error.message || 'Failed to save team')
    }
  }

  const confirmDelete = async () => {
    if (!teamToDelete) return

    try {
      await deleteTeam(teamToDelete.id)
      toast.success(`${teamToDelete.name} deleted`)
      setTeamToDelete(null)
    } catch (error) {
      console.error('DELETE TEAM ERROR:', error)
      toast.error(error.message || 'Failed to delete team')
    }
  }

  const getRoster = (teamId) => {
    return players.filter(
      (player) =>
        player.status === 'Sold' &&
        player.teamId === teamId
    )
  }

  return (
    <section className="page-section">

      {/* HEADER */}
      <div className="page-header">

        <div>
          <p className="eyebrow">
            SBT MAJOR · TOURNAMENT ROSTER
          </p>

          <h1>TEAMS</h1>

          <p>
            Build and manage every competing squad in the Major.
          </p>
        </div>

        {isAdmin && (
          <button
            className="button button-primary"
            onClick={openCreate}
          >
            <FaPlus />
            Create Team
          </button>
        )}

      </div>

      {/* TEAM GRID */}
      <div className="team-grid">

        {teams.map((team) => {
          const roster = getRoster(team.id)

          const remainingBudget = Math.max(
            0,
            Number(
              team.startingBudget ??
              team.starting_budget ??
              team.budget ??
              100000
            ) -
              roster.reduce(
                (total, player) =>
                  total +
                  Number(
                    player.soldPrice ??
                    player.basePrice ??
                    0
                  ),
                0
              )
          )

          return (
            <article
              className="team-card glass-card"
              key={team.id}
              style={{
                '--team-color': team.color,
              }}
              onClick={() => setViewTeam(team)}
            >

              {/* LOGO */}
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

                {/* ADMIN ACTIONS */}
                {isAdmin && (
                  <div className="team-actions">

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        openEdit(team)
                      }}
                      aria-label={`Edit ${team.name}`}
                    >
                      <FaEdit />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setTeamToDelete(team)
                      }}
                      aria-label={`Delete ${team.name}`}
                    >
                      <FaTrash />
                    </button>

                  </div>
                )}

              </div>

              {/* TEAM INFO */}
              <h2>{team.name}</h2>

              <p className="team-owner">
                Owner:
                <strong> {team.owner}</strong>
              </p>

              {/* DETAILS */}
              <div className="team-details">

                <div>
                  <span>REMAINING BUDGET</span>

                  <strong>
                    {formatCurrency(remainingBudget)}
                  </strong>
                </div>

                <div>
                  <span>PLAYERS</span>

                  <strong>
                    <FaUsers />
                    {roster.length}
                  </strong>
                </div>

              </div>

            </article>
          )
        })}

      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <TeamModal
          team={selectedTeam}
          onClose={() => setIsModalOpen(false)}
          onSave={saveTeam}
        />
      )}

      {/* DELETE CONFIRMATION */}
      {teamToDelete && (
        <ConfirmDialog
          title="Delete this team?"
          message={`This will permanently remove ${teamToDelete.name} from the tournament roster.`}
          onCancel={() => setTeamToDelete(null)}
          onConfirm={confirmDelete}
        />
      )}

      {/* TEAM DETAILS */}
      {viewTeam && (
        <TeamDetailsModal
          team={viewTeam}
          players={players}
          onClose={() => setViewTeam(null)}
        />
      )}

    </section>
  )
}

export default Teams