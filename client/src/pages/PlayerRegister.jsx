import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaCheckCircle, FaLock, FaUserPlus } from 'react-icons/fa'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

const INITIAL_FORM = {
  email: '',
  password: '',
  confirmPassword: '',
  realName: '',
  nickname: '',
  country: 'Pakistan',
  age: '',
  role: 'Player',
}

const STYLES = `
  .player-register-page{min-height:100vh;padding:34px 18px 60px;background:radial-gradient(circle at 50% 0,rgba(255,48,72,.11),transparent 34%),#03060d}
  .player-register-shell{width:min(100%,760px);margin:0 auto}.player-register-top{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-bottom:22px}
  .player-register-brand{color:#f7f7f5;font:800 1.4rem/1 'Barlow Condensed',sans-serif;letter-spacing:.1em;text-transform:uppercase}.player-register-brand span{color:#ff3048}
  .player-register-back{display:inline-flex;align-items:center;gap:7px;color:#90959d;font-size:.65rem;font-weight:800;text-transform:uppercase}
  .player-register-card{padding:30px;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:linear-gradient(145deg,#17181b,#0b0c0e);box-shadow:0 28px 70px rgba(0,0,0,.38)}
  .player-register-card h1{margin:7px 0 8px;color:#fff;font:900 clamp(2.3rem,6vw,3.7rem)/.9 'Barlow Condensed',sans-serif;text-transform:uppercase}
  .player-register-intro,.player-register-note{color:#92969e;font-size:.76rem;line-height:1.6}.player-register-form{display:grid;gap:15px;margin-top:22px}
  .player-register-grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.player-register-form label>span{display:block;margin-bottom:7px;color:#a9adb5;font-size:.61rem;font-weight:900;letter-spacing:.08em;text-transform:uppercase}
  .player-register-form input,.player-register-form select{width:100%;min-height:45px;box-sizing:border-box;border:1px solid rgba(255,255,255,.08);border-radius:7px;outline:0;padding:0 12px;color:#fff;background:rgba(255,255,255,.02)}
  .player-register-form input:focus,.player-register-form select:focus{border-color:rgba(255,48,72,.4);box-shadow:0 0 0 3px rgba(255,48,72,.07)}
  .player-register-password{display:flex;align-items:center;gap:9px;min-height:45px;padding:0 12px;border:1px solid rgba(255,255,255,.08);border-radius:7px;background:rgba(255,255,255,.02)}.player-register-password svg{color:#777}.player-register-password input{border:0!important;box-shadow:none!important;padding:0!important}
  .player-register-note{margin:1px 0 0;padding:12px 13px;border:1px solid rgba(255,255,255,.06);border-radius:8px;background:rgba(255,255,255,.018)}
  .player-register-submit{width:100%;justify-content:center;min-height:48px}.player-register-success{text-align:center;padding:45px 20px}.player-register-success svg{color:#f3c747;font-size:2.2rem;margin-bottom:13px}.player-register-success h2{margin:0 0 7px;color:#fff;font:900 2.4rem/1 'Barlow Condensed',sans-serif;text-transform:uppercase}.player-register-success p{max-width:500px;margin:0 auto;color:#858a92;font-size:.72rem;line-height:1.6}
  @media(max-width:620px){.player-register-card{padding:21px}.player-register-grid{grid-template-columns:1fr}.player-register-top{align-items:flex-start;flex-direction:column}}
`

function PlayerRegister() {
  const navigate = useNavigate()
  const [form, setForm] = useState(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const updateField = (event) => {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const email = form.email.trim().toLowerCase()
    const password = form.password
    const realName = form.realName.trim()
    const nickname = form.nickname.trim().replace(/\s+/g, ' ')
    const country = form.country.trim()
    const age = Number(form.age)

    if (!email || !realName || !nickname || !country) {
      toast.error('Please complete all required fields')
      return
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }
    if (password !== form.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    if (!Number.isInteger(age) || age < 13 || age > 80) {
      toast.error('Enter a valid age')
      return
    }

    setLoading(true)

    try {
      const { data: existingRows, error: duplicateCheckError } = await supabase
        .from('player_registrations')
        .select('id, email, nickname, status')
        .or(`email.eq.${email},nickname.ilike.${nickname}`)
        .limit(10)

      if (duplicateCheckError) throw duplicateCheckError

      const duplicate = (existingRows || []).find((row) =>
        String(row.email || '').trim().toLowerCase() === email ||
        String(row.nickname || '').trim().replace(/\s+/g, ' ').toLowerCase() === nickname.toLowerCase()
      )

      if (duplicate) {
        throw new Error('A registration with this email or nickname already exists.')
      }

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (signUpError) {
        if (signUpError.message?.toLowerCase().includes('already registered')) {
          throw new Error('This email already has a player account. Use Player Login.')
        }
        throw signUpError
      }

      const { error: registrationError } = await supabase
        .from('player_registrations')
        .insert({
          email,
          real_name: realName,
          nickname,
          country,
          age,
          role: form.role,
          status: 'Pending',
          user_id: authData.user?.id || null,
          reviewed_at: null,
          reviewed_by: null,
          admin_note: null,
        })

      if (registrationError) throw registrationError

      setSubmitted(true)
      toast.success('Player account and registration created')
    } catch (error) {
      console.error('PLAYER REGISTRATION ERROR:', error)
      toast.error(error?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="player-register-page">
      <style>{STYLES}</style>
      <section className="player-register-shell">
        <header className="player-register-top">
          <Link className="player-register-brand" to="/">SBT <span>MAJOR</span></Link>
          <Link className="player-register-back" to="/player-login"><FaArrowLeft /> Player Login</Link>
        </header>

        <section className="player-register-card">
          {submitted ? (
            <div className="player-register-success">
              <FaCheckCircle />
              <p className="eyebrow">REGISTRATION RECEIVED</p>
              <h2>You're on the list</h2>
              <p>Your player account has been created and your registration is pending admin approval. After approval, sign in with your email and password to access personal notifications.</p>
              <button className="button button-primary" type="button" onClick={() => navigate('/player-login')} style={{ marginTop: 20 }}>Player Login</button>
            </div>
          ) : (
            <>
              <p className="eyebrow">SBT MAJOR · PLAYER REGISTRATION</p>
              <h1>Create Player Account</h1>
              <p className="player-register-intro">Create your player login now. Your account becomes an official player account only after admin approval.</p>

              <form className="player-register-form" onSubmit={handleSubmit}>
                <div className="player-register-grid">
                  <label><span>Email / Login ID</span><input name="email" type="email" value={form.email} onChange={updateField} placeholder="player@email.com" autoComplete="email" required /></label>
                  <label><span>Age</span><input name="age" type="number" min="13" max="80" value={form.age} onChange={updateField} placeholder="18" required /></label>
                </div>

                <div className="player-register-grid">
                  <label><span>Password</span><div className="player-register-password"><FaLock /><input name="password" type="password" value={form.password} onChange={updateField} placeholder="At least 6 characters" autoComplete="new-password" required /></div></label>
                  <label><span>Confirm Password</span><div className="player-register-password"><FaLock /><input name="confirmPassword" type="password" value={form.confirmPassword} onChange={updateField} placeholder="Repeat password" autoComplete="new-password" required /></div></label>
                </div>

                <div className="player-register-grid">
                  <label><span>Real Name</span><input name="realName" value={form.realName} onChange={updateField} placeholder="Your full name" required /></label>
                  <label><span>Nickname</span><input name="nickname" value={form.nickname} onChange={updateField} placeholder="In-game nickname" required /></label>
                </div>

                <div className="player-register-grid">
                  <label><span>Country</span><input name="country" value={form.country} onChange={updateField} placeholder="Pakistan" required /></label>
                  <label><span>Role</span><select name="role" value={form.role} onChange={updateField}><option value="Player">Player</option><option value="IGL">IGL</option><option value="AWPer">AWPer</option><option value="Entry">Entry</option><option value="Support">Support</option><option value="Lurker">Lurker</option></select></label>
                </div>

                <p className="player-register-note">Your email is your login ID. Notifications will be available only after the tournament admin approves your registration.</p>
                <button className="button button-primary player-register-submit" type="submit" disabled={loading}>{loading ? 'Creating account…' : 'Create Player Account'}</button>
              </form>
            </>
          )}
        </section>
      </section>
    </main>
  )
}

export default PlayerRegister
