import { useEffect, useState } from 'react'
import { FaTimes, FaUpload } from 'react-icons/fa'

const roles = ['IGL', 'AWPer', 'Rifler', 'Entry', 'Support']
const statuses = ['Unsold', 'Sold']
const emptyPlayer = { nickname: '', realName: '', age: '', country: '', photo: '', role: 'Rifler', basePrice: 10000, status: 'Unsold', teamId: '' }

function PlayerModal({ player, teams, onClose, onSave }) {
  const getInitialForm = () => player ? {
    ...emptyPlayer,
    ...player,
    realName: player.realName || player.playerName || '',
    nickname: player.nickname || player.playerName || '',
    photo: player.photo || player.image || '',
    status: player.status === 'Sold' ? 'Sold' : 'Unsold',
  } : emptyPlayer
  const [form, setForm] = useState(getInitialForm)

  useEffect(() => setForm(getInitialForm()), [player])

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }))
  const handleImage = (event) => {
    const [file] = event.target.files
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => updateField('photo', reader.result)
    reader.readAsDataURL(file)
  }
  const handleStatusChange = (status) => setForm((current) => ({ ...current, status, teamId: status === 'Sold' ? current.teamId : '' }))
  const handleSubmit = (event) => {
    event.preventDefault()
    onSave({ ...player, ...form, age: Number(form.age), basePrice: Number(form.basePrice), teamId: form.status === 'Sold' ? form.teamId : '' })
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
    <section className="team-modal player-modal" role="dialog" aria-modal="true" aria-labelledby="player-modal-title" onMouseDown={(event) => event.stopPropagation()}>
      <header><div><p className="eyebrow">Player Management</p><h2 id="player-modal-title">{player ? 'Edit Player' : 'Add Player'}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close modal"><FaTimes /></button></header>
      <form onSubmit={handleSubmit}>
        <div className="team-form-row"><label>Nickname / In-Game Name<input value={form.nickname} onChange={(event) => updateField('nickname', event.target.value)} placeholder="e.g. markeloff" required /></label><label>Real Name<input value={form.realName} onChange={(event) => updateField('realName', event.target.value)} placeholder="Full name" required /></label></div>
        <div className="team-form-row"><label>Age<input type="number" min="13" max="99" value={form.age} onChange={(event) => updateField('age', event.target.value)} placeholder="Age" required /></label><label>Country<input value={form.country} onChange={(event) => updateField('country', event.target.value)} placeholder="Country" required /></label></div>
        <div className="team-form-row"><label>Role<select value={form.role} onChange={(event) => updateField('role', event.target.value)}>{roles.map((role) => <option key={role}>{role}</option>)}</select></label><label>Base Price<input type="number" min="0" value={form.basePrice} onChange={(event) => updateField('basePrice', event.target.value)} required /></label></div>
        <div className="team-form-row"><label>Status<select value={form.status} onChange={(event) => handleStatusChange(event.target.value)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label><label>Team<select value={form.teamId} onChange={(event) => updateField('teamId', event.target.value)} disabled={form.status !== 'Sold'} required={form.status === 'Sold'}><option value="">{form.status === 'Sold' ? 'Select assigned team' : 'Assigned when sold'}</option>{teams.map((team) => <option value={team.id} key={team.id}>{team.name}</option>)}</select></label></div>
        <label className="logo-upload">Player Image<input type="file" accept="image/*" onChange={handleImage} /><span><FaUpload /> {form.photo ? 'Image selected' : 'Choose player image'}</span></label>
        {form.photo && <img className="logo-preview" src={form.photo} alt="Player preview" />}
        <div className="modal-actions"><button type="button" className="button button-secondary" onClick={onClose}>Cancel</button><button className="button button-primary" type="submit">{player ? 'Save Changes' : 'Add Player'}</button></div>
      </form>
    </section>
  </div>
}

export default PlayerModal
