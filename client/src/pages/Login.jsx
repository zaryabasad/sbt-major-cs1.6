import { useState } from 'react'
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { FaLock, FaUser } from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'

function Login() {
  const { user, login, loading } = useAuth()

  const navigate = useNavigate()
  const location = useLocation()

  const [credentials, setCredentials] = useState({
    email: '',
    password: '',
  })

  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (loading) {
    return (
      <main className="login-page">
        <p>Checking authentication...</p>
      </main>
    )
  }

  if (user) {
    return <Navigate to="/admin" replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    setError('')
    setIsSubmitting(true)

    const result = await login(
      credentials.email,
      credentials.password
    )

    if (!result.success) {
      setError(
        'Invalid email or password. Please check your credentials.'
      )
      setIsSubmitting(false)
      return
    }

    navigate(
      location.state?.from?.pathname || '/admin',
      { replace: true }
    )
  }

  return (
    <main className="login-page">
      <Link className="brand" to="/">
        SBT <span>MAJOR</span>
      </Link>

      <section className="login-card">
        <p className="eyebrow">
          Control Center
        </p>

        <h1>Admin Login</h1>

        <p className="login-intro">
          Sign in to manage the SBT MAJOR tournament.
        </p>

        <form onSubmit={handleSubmit}>
          <label>
            <span>Email</span>

            <div className="input-wrap">
              <FaUser />

              <input
                value={credentials.email}
                onChange={(event) =>
                  setCredentials({
                    ...credentials,
                    email: event.target.value,
                  })
                }
                type="email"
                autoComplete="email"
                placeholder="Enter admin email"
                required
              />
            </div>
          </label>

          <label>
            <span>Password</span>

            <div className="input-wrap">
              <FaLock />

              <input
                value={credentials.password}
                onChange={(event) =>
                  setCredentials({
                    ...credentials,
                    password: event.target.value,
                  })
                }
                type="password"
                autoComplete="current-password"
                placeholder="Enter password"
                required
              />
            </div>
          </label>

          {error && (
            <p
              className="login-error"
              role="alert"
            >
              {error}
            </p>
          )}

          <button
            className="button button-primary"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? 'Signing in...'
              : 'Login to Dashboard'}
          </button>
        </form>
      </section>
    </main>
  )
}

export default Login