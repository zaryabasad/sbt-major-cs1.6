import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { FaLock, FaUser } from 'react-icons/fa'
import { useAuth } from '../context/AuthContext'

function Login() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [error, setError] = useState('')

  if (user) return <Navigate to="/admin" replace />

  const handleSubmit = (event) => {
    event.preventDefault()
    if (!login(credentials.username, credentials.password)) {
      setError('Invalid username or password. Please try again.')
      return
    }
    navigate(location.state?.from?.pathname || '/admin', { replace: true })
  }

  return <main className="login-page"><Link className="brand" to="/">SBT <span>MAJOR</span></Link><section className="login-card"><p className="eyebrow">Control Center</p><h1>Admin Login</h1><p className="login-intro">Sign in to manage the SBT MAJOR tournament.</p><form onSubmit={handleSubmit}><label><span>Username</span><div className="input-wrap"><FaUser /><input value={credentials.username} onChange={(event) => setCredentials({ ...credentials, username: event.target.value })} autoComplete="username" placeholder="Enter username" required /></div></label><label><span>Password</span><div className="input-wrap"><FaLock /><input value={credentials.password} onChange={(event) => setCredentials({ ...credentials, password: event.target.value })} type="password" autoComplete="current-password" placeholder="Enter password" required /></div></label>{error && <p className="login-error" role="alert">{error}</p>}<button className="button button-primary" type="submit">Login to Dashboard</button></form></section></main>
}

export default Login
