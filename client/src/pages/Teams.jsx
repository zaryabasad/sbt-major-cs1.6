import { useState } from 'react'
import {
  FaEdit,
  FaPlus,
  FaShieldAlt,
  FaTrash,
  FaUsers,
  FaTimes,
  FaImage,
} from 'react-icons/fa'
import toast from 'react-hot-toast'

import ConfirmDialog from '../components/ConfirmDialog'
import TeamDetailsModal from '../components/TeamDetailsModal'

import { usePlayers } from '../context/PlayersContext'
import { useTeams } from '../context/TeamsContext'
import { useAuth } from '../context/AuthContext'
import { formatCurrency } from '../utils/formatCurrency'

function Teams() {
  const {
    isAdmin,
    isSuperAdmin,
  } = useAuth()

  const {
    teams = [],
    addTeam,
    updateTeam,
    deleteTeam,
  } = useTeams()

  const { players = [] } = usePlayers()

  const [selectedTeam, setSelectedTeam] = useState(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [teamToDelete, setTeamToDelete] = useState(null)
  const [viewTeam, setViewTeam] = useState(null)

  const [form, setForm] = useState({
    name: '',
    owner: '',
    startingBudget: 100000,
    color: '#F5C542',
    logo: '',
  })

  const openCreate = () => {
    if (!isSuperAdmin) return
    setSelectedTeam(null)

    setForm({
      name: '',
      owner: '',
      startingBudget: 100000,
      color: '#F5C542',
      logo: '',
    })

    setIsModalOpen(true)
  }

  const openEdit = (team) => {
    if (!isSuperAdmin) return
    setSelectedTeam(team)

    setForm({
      name: team.name || '',
      owner: team.owner || '',
      startingBudget: Number(
        team.startingBudget ??
          team.budget ??
          100000
      ),
      color: team.color || '#F5C542',
      logo: team.logo || '',
    })

    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setSelectedTeam(null)
  }

  const handleInput = (event) => {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleLogo = (event) => {
    const file = event.target.files?.[0]

    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      setForm((current) => ({
        ...current,
        logo: String(reader.result || ''),
      }))
    }

    reader.onerror = () => {
      toast.error('Failed to read logo')
    }

    reader.readAsDataURL(file)
  }

  const saveTeam = async (event) => {
    if (!isSuperAdmin) {
      toast.error(
        'Only the Super Admin can manage teams'
      )
      return
    }

    event.preventDefault()

    try {
      console.log('TEAM SAVE STARTED')

      const teamName = String(form.name || '').trim()
      const ownerName = String(form.owner || '').trim()

      if (!teamName) {
        toast.error('Team name is required')
        return
      }

      if (!ownerName) {
        toast.error('Owner name is required')
        return
      }

      const budget = Number(form.startingBudget)

      if (!Number.isFinite(budget) || budget < 0) {
        toast.error('Enter a valid starting budget')
        return
      }

      // Duplicate check is completely local to this function.
      // No outside normalizedName variable is used.
      const duplicate = teams.some((item) => {
        const existingName = String(
          item.name || ''
        )
          .trim()
          .toLowerCase()

        const newName = teamName.toLowerCase()

        return (
          item.id !== selectedTeam?.id &&
          existingName === newName
        )
      })

      if (duplicate) {
        toast.error(
          'A team with this name already exists'
        )
        return
      }

      const teamData = {
        ...(selectedTeam || {}),
        name: teamName,
        owner: ownerName,
        startingBudget: budget,
        budget: budget,
        color: form.color || '#F5C542',
        logo: form.logo || '',
      }

      console.log('TEAM DATA:', teamData)

      if (selectedTeam) {
        await updateTeam(teamData)
        toast.success(
          'Team updated successfully'
        )
      } else {
        await addTeam(teamData)
        toast.success(
          'Team created successfully'
        )
      }

      closeModal()
    } catch (error) {
      console.error(
        'TEAM SAVE ERROR:',
        error
      )

      toast.error(
        error?.message ||
          'Failed to save team'
      )
    }
  }

  const confirmDelete = async () => {
    if (!isSuperAdmin || !teamToDelete) return

    try {
      await deleteTeam(teamToDelete.id)

      toast.success(
        `${teamToDelete.name} deleted`
      )

      setTeamToDelete(null)
    } catch (error) {
      console.error(
        'TEAM DELETE ERROR:',
        error
      )

      toast.error(
        error?.message ||
          'Failed to delete team'
      )
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
    <section className="teams-page">
      {/* ============================= */}
      {/* HEADER */}
      {/* ============================= */}

      <header className="teams-heading">
        <div>
          <p className="eyebrow">
            SBT Major · Tournament Roster
          </p>

          <h1>Teams</h1>

          <p>
            Build and manage every competing
            squad in the Major.
          </p>
        </div>

        {isAdmin && !isSuperAdmin && (
          <div className="teams-readonly-note">
            Team Admin · Read Only
          </div>
        )}

        {isSuperAdmin && (
          <button
            className="button button-primary"
            type="button"
            onClick={openCreate}
          >
            <FaPlus />
            Create Team
          </button>
        )}
      </header>

      {/* ============================= */}
      {/* TEAMS */}
      {/* ============================= */}

      {teams.length === 0 ? (
        <section className="empty-teams glass-card">
          <FaShieldAlt />

          <h2>No teams created yet</h2>

          <p>
            Add the first team to begin
            preparing the SBT MAJOR roster.
          </p>

          {isSuperAdmin && (
            <button
              className="button button-primary"
              type="button"
              onClick={openCreate}
            >
              <FaPlus />
              Create First Team
            </button>
          )}
        </section>
      ) : (
        <div className="teams-grid">
          {teams.map((team) => {
            const roster = getRoster(team.id)

            const startingBudget = Number(
              team.startingBudget ??
                team.budget ??
                100000
            )

            const spent = roster.reduce(
              (total, player) =>
                total +
                Number(
                  player.soldPrice ??
                    player.basePrice ??
                    0
                ),
              0
            )

            const remainingBudget =
              Math.max(
                0,
                startingBudget - spent
              )

            return (
              <article
                className="team-card glass-card"
                key={team.id}
                style={{
                  '--team-color':
                    team.color ||
                    '#F5C542',
                }}
                onClick={() =>
                  setViewTeam(team)
                }
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

                  {isSuperAdmin && (
                    <div className="team-actions">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          openEdit(team)
                        }}
                        aria-label={`Edit ${team.name}`}
                      >
                        <FaEdit />
                      </button>

                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          setTeamToDelete(team)
                        }}
                        aria-label={`Delete ${team.name}`}
                      >
                        <FaTrash />
                      </button>
                    </div>
                  )}
                </div>

                <h2>{team.name}</h2>

                <p className="team-owner">
                  Owner:
                  <strong>
                    {' '}
                    {team.owner || 'N/A'}
                  </strong>
                </p>

                <div className="team-details">
                  <div>
                    <span>
                      Remaining Budget
                    </span>

                    <strong>
                      {formatCurrency(
                        remainingBudget
                      )}
                    </strong>
                  </div>

                  <div>
                    <FaUsers />

                    <span>
                      Players
                    </span>

                    <strong>
                      {roster.length}
                    </strong>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* ============================= */}
      {/* CREATE / EDIT MODAL */}
      {/* ============================= */}

      {isSuperAdmin && isModalOpen && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal()
            }
          }}
        >
          <div
            className="glass-card"
            style={{
              width: 'min(600px, 94vw)',
              padding: '28px',
              position: 'relative',
            }}
          >
            <button
              type="button"
              onClick={closeModal}
              style={{
                position: 'absolute',
                right: '18px',
                top: '18px',
              }}
              aria-label="Close"
            >
              <FaTimes />
            </button>

            <p className="eyebrow">
              TEAM MANAGEMENT
            </p>

            <h2
              style={{
                marginBottom: '24px',
              }}
            >
              {selectedTeam
                ? 'EDIT TEAM'
                : 'CREATE TEAM'}
            </h2>

            <form onSubmit={saveTeam}>
              {/* TEAM NAME */}

              <label
                style={{
                  display: 'block',
                  marginBottom: '16px',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    marginBottom: '7px',
                  }}
                >
                  TEAM NAME
                </span>

                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleInput}
                  placeholder="Enter team name"
                  autoComplete="off"
                />
              </label>

              {/* OWNER */}

              <label
                style={{
                  display: 'block',
                  marginBottom: '16px',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    marginBottom: '7px',
                  }}
                >
                  OWNER NAME
                </span>

                <input
                  type="text"
                  name="owner"
                  value={form.owner}
                  onChange={handleInput}
                  placeholder="Enter owner name"
                  autoComplete="off"
                />
              </label>

              {/* BUDGET + COLOR */}

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns:
                    '1fr 120px',
                  gap: '14px',
                  marginBottom: '16px',
                }}
              >
                <label>
                  <span
                    style={{
                      display: 'block',
                      marginBottom: '7px',
                    }}
                  >
                    STARTING BUDGET
                  </span>

                  <input
                    type="number"
                    name="startingBudget"
                    min="0"
                    step="1000"
                    value={
                      form.startingBudget
                    }
                    onChange={handleInput}
                  />
                </label>

                <label>
                  <span
                    style={{
                      display: 'block',
                      marginBottom: '7px',
                    }}
                  >
                    TEAM COLOR
                  </span>

                  <input
                    type="color"
                    name="color"
                    value={
                      form.color
                    }
                    onChange={handleInput}
                    style={{
                      width: '100%',
                      height: '42px',
                      padding: '3px',
                    }}
                  />
                </label>
              </div>

              {/* LOGO */}

              <label
                style={{
                  display: 'block',
                  marginBottom: '20px',
                }}
              >
                <span
                  style={{
                    display: 'block',
                    marginBottom: '7px',
                  }}
                >
                  TEAM LOGO
                </span>

                <div
                  style={{
                    border:
                      '1px dashed rgba(255,255,255,.25)',
                    padding: '16px',
                    textAlign: 'center',
                    borderRadius: '8px',
                  }}
                >
                  {form.logo ? (
                    <div>
                      <img
                        src={form.logo}
                        alt="Team logo preview"
                        style={{
                          width: '90px',
                          height: '90px',
                          objectFit: 'contain',
                          display: 'block',
                          margin:
                            '0 auto 12px',
                        }}
                      />

                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={() =>
                          setForm(
                            (current) => ({
                              ...current,
                              logo: '',
                            })
                          )
                        }
                      >
                        Remove Logo
                      </button>
                    </div>
                  ) : (
                    <label
                      style={{
                        cursor: 'pointer',
                        display: 'block',
                      }}
                    >
                      <FaImage />

                      <div>
                        Choose image file
                      </div>

                      <input
                        type="file"
                        accept="image/*"
                        onChange={
                          handleLogo
                        }
                        style={{
                          display: 'none',
                        }}
                      />
                    </label>
                  )}
                </div>
              </label>

              {/* ACTIONS */}

              <div
                style={{
                  display: 'flex',
                  justifyContent:
                    'flex-end',
                  gap: '10px',
                }}
              >
                <button
                  type="button"
                  className="button button-secondary"
                  onClick={closeModal}
                >
                  CANCEL
                </button>

                <button
                  type="submit"
                  className="button button-primary"
                >
                  {selectedTeam
                    ? 'SAVE CHANGES'
                    : 'CREATE TEAM'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================= */}
      {/* DELETE CONFIRM */}
      {/* ============================= */}

      {isSuperAdmin && teamToDelete && (
        <ConfirmDialog
          title="Delete Team"
          message={`Are you sure you want to delete ${teamToDelete.name}?`}
          onConfirm={confirmDelete}
          onCancel={() =>
            setTeamToDelete(null)
          }
        />
      )}

      {/* ============================= */}
      {/* TEAM DETAILS */}
      {/* ============================= */}

      {viewTeam && (
        <TeamDetailsModal
          team={viewTeam}
          players={getRoster(viewTeam.id)}
          onClose={() =>
            setViewTeam(null)
          }
        />
      )}
    </section>
  )
}

export default Teams