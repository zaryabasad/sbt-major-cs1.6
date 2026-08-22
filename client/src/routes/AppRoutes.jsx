import { BrowserRouter, Route, Routes } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import Admin from '../pages/Admin'
import Auction from '../pages/Auction'
import GroupChat from '../pages/GroupChat'
import PoolFixturesAdminBar from '../pages/PoolFixturesAdminBar'
import Home from '../pages/Home'
import Login from '../pages/Login'
import PoolPlayoffs from '../pages/PoolPlayoffs'
import Stats from '../pages/Stats'
import Teams from '../pages/Teams'
import VoiceChat from '../pages/VoiceChatFixed'
import ProtectedRoute from '../components/ProtectedRoute'
import Players from '../pages/Players'
import PlayerRegister from '../pages/PlayerRegister'
import Legends from '../pages/Legends'

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/auction" element={<Auction />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/players" element={<Players />} />
          <Route path="/fixtures" element={<PoolFixturesAdminBar />} />
          <Route path="/playoffs" element={<PoolPlayoffs />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/legends" element={<Legends />} />
          <Route path="/chat" element={<GroupChat />} />
          <Route path="/voice" element={<VoiceChat />} />
          <Route path="/player-register" element={<PlayerRegister />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/admin" element={<Admin />} />
            <Route path="/admin/players" element={<Players />} />
          </Route>
        </Route>

        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRoutes
