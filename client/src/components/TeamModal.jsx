import { useEffect, useState } from 'react'
import { FaTimes, FaUpload } from 'react-icons/fa'

const emptyTeam = { name: '', owner: '', logo: '', startingBudget: 100000, color: '#f3c747' }

function TeamModal({ team, onClose, onSave }) {
  const getInitialForm = () => team ? { ...emptyTeam, ...team, startingBudget: team.startingBudget ?? team.budget ?? 100000 } : emptyTeam
  const [form, setForm] = useState(getInitialForm)
  useEffect(() => setForm(getInitialForm()), [team])

  const handleLogoUpload = (event) => {
    const [file] = event.target.files
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setForm((current) => ({ ...current, logo: reader.result }))
    reader.readAsDataURL(file)
  }
  const handleSubmit = (event) => { event.preventDefault(); onSave({ ...team, ...form, startingBudget: Number(form.startingBudget) }) }

  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="team-modal" role="dialog" aria-modal="true" aria-labelledby="team-modal-title" onMouseDown={(event) => event.stopPropagation()}><header><div><p className="eyebrow">Team Management</p><h2 id="team-modal-title">{team ? 'Edit Team' : 'Create Team'}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close modal"><FaTimes /></button></header><form onSubmit={handleSubmit}><label>Team Name<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Enter team name" required /></label><label>Owner Name<input value={form.owner} onChange={(event) => setForm({ ...form, owner: event.target.value })} placeholder="Enter owner name" required /></label><div className="team-form-row"><label>Starting Budget<input type="number" min="0" value={form.startingBudget} onChange={(event) => setForm({ ...form, startingBudget: event.target.value })} required /></label><label>Team Color<input className="color-input" type="color" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} /></label></div><label className="logo-upload">Team Logo Upload<input type="file" accept="image/*" onChange={handleLogoUpload} /><span><FaUpload /> {form.logo ? 'Logo selected' : 'Choose image file'}</span></label>{form.logo && <img className="logo-preview" src={form.logo} alt="Team logo preview" />}<div className="modal-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit">{team ? 'Save Changes' : 'Create Team'}</button></div></form></section></div>
}

export default TeamModal
