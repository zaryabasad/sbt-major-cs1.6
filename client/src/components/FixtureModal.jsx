import { useEffect, useState } from 'react'
import { FaTimes } from 'react-icons/fa'

function FixtureModal({ fixture, teams, onClose, onSave }) {
  const [form, setForm] = useState({
    ...fixture,
    homeScore: fixture.homeScore ?? '',
    awayScore: fixture.awayScore ?? '',
  })

  useEffect(() => {
    setForm({
      ...fixture,
      homeScore: fixture.homeScore ?? '',
      awayScore: fixture.awayScore ?? '',
    })
  }, [fixture])

  const updateField = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const homeTeam = teams.find((team) => team.id === form.homeTeamId)
  const awayTeam = teams.find((team) => team.id === form.awayTeamId)

  const handleSubmit = (event) => {
    event.preventDefault()

    let winnerId = ''

    if (form.status === 'Completed') {
      const homeScore = Number(form.homeScore)
      const awayScore = Number(form.awayScore)

      if (
        form.homeScore === '' ||
        form.awayScore === '' ||
        homeScore === awayScore
      ) {
        return
      }

      winnerId =
        homeScore > awayScore
          ? form.homeTeamId
          : form.awayTeamId
    }

    onSave({
      ...form,
      homeScore:
        form.status === 'Completed' ? Number(form.homeScore) : '',
      awayScore:
        form.status === 'Completed' ? Number(form.awayScore) : '',
      winnerId,
    })
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="team-modal fixture-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fixture-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <p className="eyebrow">Match Control</p>
            <h2 id="fixture-modal-title">Edit Fixture</h2>
          </div>

          <button
            className="icon-button"
            type="button"
            onClick={onClose}
            aria-label="Close modal"
          >
            <FaTimes />
          </button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="fixture-teams-label">
            {homeTeam?.name || 'Deleted Team'}
            <span>vs</span>
            {awayTeam?.name || 'Deleted Team'}
          </div>

          <div className="team-form-row">
            <label>
              Match Date
              <input
                type="date"
                value={form.date}
                onChange={(event) =>
                  updateField('date', event.target.value)
                }
                required
              />
            </label>

            <label>
              Time
              <input
                type="time"
                value={form.time}
                onChange={(event) =>
                  updateField('time', event.target.value)
                }
                required
              />
            </label>
          </div>

          <div className="team-form-row">
            <label>
              Format
              <select
                value={form.format}
                onChange={(event) =>
                  updateField('format', event.target.value)
                }
              >
                <option>BO1</option>
                <option>BO3</option>
              </select>
            </label>

            <label>
              Status
              <select
                value={form.status}
                onChange={(event) =>
                  updateField('status', event.target.value)
                }
              >
                <option>Upcoming</option>
                <option>Completed</option>
              </select>
            </label>
          </div>

          {form.status === 'Completed' && (
            <div className="score-section">
              <p className="eyebrow">Match Result</p>

              <div className="team-form-row">
                <label>
                  {homeTeam?.name || 'Home Team'} Score
                  <input
                    type="number"
                    min="0"
                    value={form.homeScore}
                    onChange={(event) =>
                      updateField('homeScore', event.target.value)
                    }
                    required
                  />
                </label>

                <label>
                  {awayTeam?.name || 'Away Team'} Score
                  <input
                    type="number"
                    min="0"
                    value={form.awayScore}
                    onChange={(event) =>
                      updateField('awayScore', event.target.value)
                    }
                    required
                  />
                </label>
              </div>

              <p className="score-help">
                Winner automatically calculate hoga based on rounds won.
              </p>
            </div>
          )}

          <div className="modal-actions">
            <button
              className="button button-secondary"
              type="button"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              className="button button-primary"
              type="submit"
            >
              Save Fixture
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default FixtureModal