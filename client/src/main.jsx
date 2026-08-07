import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { TeamsProvider } from './context/TeamsContext.jsx'
import { PlayersProvider } from './context/PlayersContext.jsx'
import { AuctionProvider } from './context/AuctionContext.jsx'
import { FixturesProvider } from './context/FixturesContext.jsx'
import { Toaster } from 'react-hot-toast'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <TeamsProvider>
        <PlayersProvider>
          <AuctionProvider>
            <FixturesProvider>
              <App />
              <Toaster position="top-right" toastOptions={{ style: { background: '#101b31', color: '#f7f4e9', border: '1px solid #f3c747' } }} />
            </FixturesProvider>
          </AuctionProvider>
        </PlayersProvider>
      </TeamsProvider>
    </AuthProvider>
  </StrictMode>,
)
