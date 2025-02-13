import React from 'react'
import LobbyScreen from './screens/Lobby'
import { Routes, Route } from 'react-router-dom'
import RoomPage from './screens/Room'

const App = () => {
  return (
    <div>
      <Routes>
        <Route path="/" element={<LobbyScreen />} />
        <Route path="/room/:roomId" element={<RoomPage/>} />
        
      </Routes>
    </div>
  )
}

export default App