import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Lobby.css";

const Lobby = () => {
  const [room, setRoom] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (room.trim()) {
      setIsLoading(true);
      navigate(`/room/${room}`);
    }
  };

  return (
    <div className="lobby-container">
      <div className="lobby-card">
        <h1 className="lobby-title">Video Chat Lobby</h1>
        <p className="lobby-description">
          Enter a room ID to start or join a video conversation.
        </p>

        <form onSubmit={handleJoinRoom} className="lobby-form">
          <input
            type="text"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            placeholder="Enter Room ID"
            required
            className="lobby-input"
          />
          <button type="submit" disabled={isLoading} className="lobby-button">
            {isLoading ? "Connecting..." : "Join Room"}
          </button>
        </form>
      </div>

      <p className="lobby-footer">Powered by WebRTC</p>
    </div>
  );
};

export default Lobby;
