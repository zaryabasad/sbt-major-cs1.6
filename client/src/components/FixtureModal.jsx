import { useEffect, useState } from 'react'
import { FaTimes } from 'react-icons/fa'

function FixtureModal({ fixture, teams, onClose, onSave }) {
  const [form, setForm] = useState(fixture)
  useEffect(() => setForm(fixture), [fixture])
  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }))
  const handleSubmit = (event) => {
    event.preventDefault()
    onSave({ ...form, winnerId: form.status === 'Completed' ? form.winnerId : '' })
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="team-modal fixture-modal" role="dialog" aria-modal="true" aria-labelledby="fixture-modal-title" onMouseDown={(event) => event.stopPropagation()}><header><div><p className="eyebrow">Match Control</p><h2 id="fixture-modal-title">Edit Fixture</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close modal"><FaTimes /></button></header><form onSubmit={handleSubmit}><div className="fixture-teams-label">{teams.find((team) => team.id === form.homeTeamId)?.name} <span>vs</span> {teams.find((team) => team.id === form.awayTeamId)?.name}</div><div className="team-form-row"><label>Match Date<input type="date" value={form.date} onChange={(event) => updateField('date', event.target.value)} required /></label><label>Time<input type="time" value={form.time} onChange={(event) => updateField('time', event.target.value)} required /></label></div><div className="team-form-row"><label>Format<select value={form.format} onChange={(event) => updateField('format', event.target.value)}><option>BO1</option><option>BO3</option></select></label><label>Status<select value={form.status} onChange={(event) => updateField('status', event.target.value)}><option>Upcoming</option><option>Completed</option></select></label></div>{form.status === 'Completed' && <label>Winner<select value={form.winnerId} onChange={(event) => updateField('winnerId', event.target.value)} required><option value="">Select winning team</option><option value={form.homeTeamId}>{teams.find((team) => team.id === form.homeTeamId)?.name}</option><option value={form.awayTeamId}>{teams.find((team) => team.id === form.awayTeamId)?.name}</option></select></label>}<div className="modal-actions"><button className="button button-secondary" type="button" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit">Save Fixture</button></div></form></section></div>
}

export default FixtureModal
