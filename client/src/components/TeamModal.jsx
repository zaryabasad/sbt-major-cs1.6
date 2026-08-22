import { useEffect, useState } from 'react'
import { FaTimes, FaUpload } from 'react-icons/fa'

const EMPTY_TEAM = {
  name: '',
  owner: '',
  logo: '',
  startingBudget: 100000,
  color: '#f3c747',
}

function TeamModal({ team, onClose, onSave }) {
  const getInitialForm = () => ({
    ...EMPTY_TEAM,
    ...(team || {}),
    startingBudget: Number(
      team?.startingBudget ??
      team?.starting_budget ??
      team?.budget ??
      100000
    ),
  })

  const [form, setForm] = useState(getInitialForm)

  useEffect(() => {
    setForm(getInitialForm())
  }, [team])

  const handleChange = (field, value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleLogoUpload = (event) => {
    const file = event.target.files?.[0]

    if (!file) return

    const reader = new FileReader()

    reader.onload = () => {
      setForm((current) => ({
        ...current,
        logo: reader.result,
      }))
    }

    reader.readAsDataURL(file)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const teamData = {
      ...(team || {}),
      name: form.name.trim(),
      owner: form.owner.trim(),
      logo: form.logo || '',
      color: form.color || '#f3c747',
      startingBudget: Number(form.startingBudget) || 100000,
    }

    console.log('🔥 TEAM MODAL SUBMIT:', teamData)

    try {
      await onSave(teamData)

      console.log('🔥 TEAM MODAL SAVE COMPLETED')
    } catch (error) {
      console.error('🔥 TEAM MODAL SAVE ERROR:', error)
    }
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <section
        className="team-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="team-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header>
          <div>
            <p className="eyebrow">Team Management</p>

            <h2 id="team-modal-title">
              {team ? 'Edit Team' : 'Create Team'}
            </h2>
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
          <label>
            Team Name

            <input
              value={form.name}
              onChange={(event) =>
                handleChange('name', event.target.value)
              }
              placeholder="Enter team name"
              required
            />
          </label>

          <label>
            Owner Name

            <input
              value={form.owner}
              onChange={(event) =>
                handleChange('owner', event.target.value)
              }
              placeholder="Enter owner name"
              required
            />
          </label>

          <div className="team-form-row">
            <label>
              Starting Budget

              <input
                type="number"
                min="0"
                value={form.startingBudget}
                onChange={(event) =>
                  handleChange(
                    'startingBudget',
                    event.target.value
                  )
                }
                required
              />
            </label>

            <label>
              Team Color

              <input
                className="color-input"
                type="color"
                value={form.color}
                onChange={(event) =>
                  handleChange('color', event.target.value)
                }
              />
            </label>
          </div>

          <label className="logo-upload">
            Team Logo Upload

            <input
              type="file"
              accept="image/*"
              onChange={handleLogoUpload}
            />

            <span>
              <FaUpload />

              {form.logo
                ? 'Logo selected'
                : 'Choose image file'}
            </span>
          </label>

          {form.logo && (
            <img
              className="logo-preview"
              src={form.logo}
              alt="Team logo preview"
            />
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="button button-secondary"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              className="button button-primary"
              type="submit"
            >
              {team ? 'Save Changes' : 'Create Team'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

export default TeamModal