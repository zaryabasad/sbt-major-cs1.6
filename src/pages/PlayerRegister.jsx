import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FaArrowLeft, FaCheckCircle, FaUserPlus } from 'react-icons/fa'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'

const INITIAL_FORM = {
  email: '',
  realName: '',
  nickname: '',
  country: 'Pakistan',
  age: '',
  role: 'Player',
}

const REGISTER_STYLES = `
  .player-register-page {
    min-height: 100vh;
    padding: 34px 18px 60px;
    background:
      radial-gradient(circle at 50% 0, rgba(255,48,72,.11), transparent 34%),
      #03060d;
  }

  .player-register-shell {
    width: min(100%, 760px);
    margin: 0 auto;
  }

  .player-register-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 22px;
  }

  .player-register-brand {
    color: #f7f7f5;
    font: 800 1.4rem/1 'Barlow Condensed', sans-serif;
    letter-spacing: .1em;
    text-transform: uppercase;
  }

  .player-register-brand span {
    color: #ff3048;
  }

  .player-register-back {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: #90959d;
    font-size: .65rem;
    font-weight: 800;
    letter-spacing: .05em;
    text-transform: uppercase;
  }

  .player-register-card {
    padding: 30px;
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 14px;
    background:
      radial-gradient(circle at 90% 0, rgba(255,48,72,.09), transparent 30%),
      linear-gradient(145deg, #17181b, #0b0c0e);
    box-shadow: 0 28px 70px rgba(0,0,0,.38), inset 0 1px rgba(255,255,255,.025);
  }

  .player-register-title-row {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    margin-bottom: 9px;
  }

  .player-register-icon {
    display: grid;
    place-items: center;
    width: 42px;
    height: 42px;
    flex: 0 0 auto;
    color: #ff3048;
    border: 1px solid rgba(255,48,72,.22);
    border-radius: 9px;
    background: rgba(255,48,72,.06);
  }

  .player-register-card h1 {
    margin: 0;
    color: #fff;
    font: 900 clamp(2.3rem, 6vw, 3.7rem)/.9 'Barlow Condensed', sans-serif;
    text-transform: uppercase;
  }

  .player-register-intro {
    max-width: 650px;
    margin: 0 0 24px;
    color: #92969e;
    font-size: .78rem;
    line-height: 1.6;
  }

  .player-register-form {
    display: grid;
    gap: 15px;
  }

  .player-register-form label > span {
    display: block;
    margin-bottom: 7px;
    color: #a9adb5;
    font-size: .61rem;
    font-weight: 900;
    letter-spacing: .08em;
    text-transform: uppercase;
  }

  .player-register-form input,
  .player-register-form select {
    width: 100%;
    min-height: 45px;
    box-sizing: border-box;
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 7px;
    outline: 0;
    padding: 0 12px;
    color: #fff;
    background: rgba(255,255,255,.02);
  }

  .player-register-form input:focus,
  .player-register-form select:focus {
    border-color: rgba(255,48,72,.40);
    box-shadow: 0 0 0 3px rgba(255,48,72,.07);
  }

  .player-register-grid {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 14px;
  }

  .player-register-note {
    margin: 1px 0 0;
    padding: 12px 13px;
    border: 1px solid rgba(255,255,255,.06);
    border-radius: 8px;
    color: #797e86;
    background: rgba(255,255,255,.018);
    font-size: .62rem;
    line-height: 1.55;
  }

  .player-register-submit {
    width: 100%;
    min-height: 48px;
    justify-content: center;
    margin-top: 3px;
  }

  .player-register-success {
    display: grid;
    place-items: center;
    padding: 45px 20px;
    text-align: center;
  }

  .player-register-success svg {
    margin-bottom: 13px;
    color: #ff3048;
    font-size: 2.2rem;
  }

  .player-register-success h2 {
    margin: 0 0 7px;
    color: #fff;
    font: 900 2.4rem/1 'Barlow Condensed', sans-serif;
    text-transform: uppercase;
  }

  .player-register-success p {
    max-width: 480px;
    margin: 0 auto;
    color: #858a92;
    font-size: .72rem;
    line-height: 1.6;
  }

  .player-register-success .button {
    margin-top: 20px;
  }

  @media (max-width: 620px) {
    .player-register-card {
      padding: 21px;
    }

    .player-register-grid {
      grid-template-columns: 1fr;
    }

    .player-register-top {
      align-items: flex-start;
      flex-direction: column;
    }
  }
`

function PlayerRegister() {
  const navigate = useNavigate()
  const [form, setForm] = useState(INITIAL_FORM)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const updateField = (event) => {
    const { name, value } = event.target

    setForm((current) => ({
      ...current,
      [name]: value,
    }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const realName = form.realName.trim()
    const nickname = form.nickname.trim()
    const email = form.email.trim().toLowerCase()
    const country = form.country.trim()
    const age = Number(form.age)

    if (!email) {
      toast.error('Email is required')
      return
    }

    if (!realName) {
      toast.error('Real name is required')
      return
    }

    if (!nickname) {
      toast.error('Nickname is required')
      return
    }

    if (!country) {
      toast.error('Country is required')
      return
    }

    if (!Number.isInteger(age) || age < 13 || age > 80) {
      toast.error('Enter a valid age')
      return
    }

    setLoading(true)

    try {
      const normalizedEmail =
        email.toLowerCase()

      const normalizedNickname =
        nickname
          .trim()
          .replace(/\s+/g, ' ')
          .toLowerCase()

      const { data: existingRows, error: duplicateCheckError } =
        await supabase
          .from('player_registrations')
          .select(
            'id, email, nickname, status'
          )
          .or(
            `email.eq.${normalizedEmail},nickname.ilike.${normalizedNickname}`
          )
          .limit(10)

      if (duplicateCheckError) {
        console.error(
          'PLAYER DUPLICATE CHECK ERROR:',
          duplicateCheckError
        )

        throw duplicateCheckError
      }

      const duplicate =
        (existingRows || []).find(
          (row) => {
            const existingEmail =
              String(
                row.email || ''
              )
                .trim()
                .toLowerCase()

            const existingNickname =
              String(
                row.nickname || ''
              )
                .trim()
                .replace(
                  /\s+/g,
                  ' '
                )
                .toLowerCase()

            return (
              existingEmail ===
                normalizedEmail ||
              existingNickname ===
                normalizedNickname
            )
          }
        )

      if (duplicate) {
        const status =
          String(
            duplicate.status ||
              'Pending'
          ).toLowerCase()

        if (
          status === 'approved' ||
          status === 'accepted'
        ) {
          throw new Error(
            'This player is already approved. Please do not register again.'
          )
        }

        throw new Error(
          'A registration with this email or nickname already exists. Please wait for admin review.'
        )
      }
      const { error } = await supabase
        .from('player_registrations')
        .insert({
          email: normalizedEmail,
          real_name: realName,
          nickname: nickname
            .trim()
            .replace(/\s+/g, ' '),
          country,
          age,
          role: form.role,
          status: 'Pending',
          user_id: null,
          reviewed_at: null,
          reviewed_by: null,
          admin_note: null,
        })

      if (error) {
        if (
          error.code === '23505' ||
          error.code === '409'
        ) {
          throw new Error(
            'This email or nickname has already been registered. Please wait for admin review.'
          )
        }

        throw error
      }

      setSubmitted(true)
      toast.success('Registration submitted for admin approval')
    } catch (error) {
      console.error('PLAYER REGISTRATION ERROR:', error)
      toast.error(error?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="player-register-page">
      <style>{REGISTER_STYLES}</style>

      <section className="player-register-shell">
        <header className="player-register-top">
          <Link className="player-register-brand" to="/">
            SBT <span>MAJOR</span>
          </Link>

          <Link className="player-register-back" to="/login">
            <FaArrowLeft />
            Admin Login
          </Link>
        </header>

        <section className="player-register-card">
          {submitted ? (
            <div className="player-register-success">
              <FaCheckCircle />
              <span className="eyebrow">REGISTRATION RECEIVED</span>
              <h2>You're on the list</h2>
              <p>
                Your player profile has been submitted successfully and is
                now waiting for main admin approval. You do not need to
                create another registration.
              </p>

              <button
                className="button button-primary"
                type="button"
                onClick={() => navigate('/')}
              >
                Back to Tournament
              </button>
            </div>
          ) : (
            <>
              <div className="player-register-title-row">
                <div className="player-register-icon">
                  <FaUserPlus />
                </div>

                <div>
                  <p className="eyebrow">SBT MAJOR · PLAYER REGISTRATION</p>
                  <h1>Join the Tournament</h1>
                </div>
              </div>

              <p className="player-register-intro">
                Submit your player details in one step. Your registration stays
                <strong> Pending </strong>
                until the main admin approves it. No password is required at
                this stage.
              </p>

              <form
                className="player-register-form"
                onSubmit={handleSubmit}
              >
                <div className="player-register-grid">
                  <label>
                    <span>Email</span>
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={updateField}
                      placeholder="player@email.com"
                      autoComplete="email"
                      required
                    />
                  </label>

                  <label>
                    <span>Age</span>
                    <input
                      name="age"
                      type="number"
                      min="13"
                      max="80"
                      value={form.age}
                      onChange={updateField}
                      placeholder="18"
                      required
                    />
                  </label>
                </div>

                <div className="player-register-grid">
                  <label>
                    <span>Real Name</span>
                    <input
                      name="realName"
                      value={form.realName}
                      onChange={updateField}
                      placeholder="Your full name"
                      required
                    />
                  </label>

                  <label>
                    <span>Nickname</span>
                    <input
                      name="nickname"
                      value={form.nickname}
                      onChange={updateField}
                      placeholder="In-game nickname"
                      required
                    />
                  </label>
                </div>

                <div className="player-register-grid">
                  <label>
                    <span>Country</span>
                    <input
                      name="country"
                      value={form.country}
                      onChange={updateField}
                      placeholder="Pakistan"
                      required
                    />
                  </label>

                  <label>
                    <span>Role</span>
                    <select
                      name="role"
                      value={form.role}
                      onChange={updateField}
                    >
                      <option value="Player">Player</option>
                      <option value="IGL">IGL</option>
                      <option value="AWPer">AWPer</option>
                      <option value="Entry">Entry</option>
                      <option value="Support">Support</option>
                      <option value="Lurker">Lurker</option>
                    </select>
                  </label>
                </div>

                <p className="player-register-note">
                  Your information is sent directly to the tournament admin.
                  You will only become an official player after approval.
                </p>

                <button
                  className="button button-primary player-register-submit"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Submitting…' : 'Submit Registration'}
                </button>
              </form>
            </>
          )}
        </section>
      </section>
    </main>
  )
}

export default PlayerRegister