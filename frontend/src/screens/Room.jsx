// Room.jsx
import React, { useRef, useEffect, useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import io from "socket.io-client";
import "./Room.css";

const SOCKET_SERVER_URL = "https://webrtc-on10.onrender.com";
const ICE_SERVERS = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

function Room() {
  const { roomId } = useParams();
  const pcRef = useRef(null);
  const socketRef = useRef(null);
  const dataChannelRef = useRef(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [localStream, setLocalStream] = useState(null);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !isVideoOn;
      });
      setIsVideoOn(!isVideoOn);
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !isAudioOn;
      });
      setIsAudioOn(!isAudioOn);
    }
  };

  const startVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setLocalStream(stream);
      localVideoRef.current.srcObject = stream;

      stream.getTracks().forEach((track) => {
        pcRef.current.addTrack(track, stream);
      });

      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      socketRef.current.emit("offer", { roomId, offer });
    } catch (error) {
      console.error("Error starting video", error);
    }
  };

  const setupRemoteVideo = useCallback(() => {
    pcRef.current.ontrack = (event) => {
      remoteVideoRef.current.srcObject = event.streams[0];
    };
  }, []);

  const handleDataChannelOpen = useCallback(() => {
    console.log("Data channel is open");
  }, []);

  const handleDataChannelMessage = useCallback((event) => {
    setMessages((prevMessages) => [
      ...prevMessages,
      { sender: "Remote", text: event.data },
    ]);
  }, []);

  const handleICECandidateEvent = useCallback(
    (event) => {
      if (event.candidate) {
        socketRef.current.emit("ice-candidate", {
          roomId,
          candidate: event.candidate,
        });
      }
    },
    [roomId]
  );

  const handleDataChannelEvent = useCallback(
    (event) => {
      const receiveChannel = event.channel;
      receiveChannel.onmessage = handleDataChannelMessage;
    },
    [handleDataChannelMessage]
  );

  const handleSocketConnect = useCallback(() => {
    console.log("Connected to socket server");
    socketRef.current.emit("join-room", roomId);
  }, [roomId]);

  const handleUserConnected = useCallback(
    async (userId) => {
      console.log("User connected:", userId);
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      socketRef.current.emit("offer", { roomId, offer });
    },
    [roomId]
  );

  const handleOffer = useCallback(
    async ({ offer }) => {
      await pcRef.current.setRemoteDescription(offer);
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      socketRef.current.emit("answer", { roomId, answer });
    },
    [roomId]
  );

  const handleAnswer = useCallback(async ({ answer }) => {
    await pcRef.current.setRemoteDescription(answer);
  }, []);

  const handleICECandidate = useCallback(async ({ candidate }) => {
    if (candidate) {
      await pcRef.current.addIceCandidate(candidate);
    }
  }, []);

  useEffect(() => {
    const socket = io(SOCKET_SERVER_URL);
    socketRef.current = socket;

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    setupRemoteVideo();

    const dataChannel = pc.createDataChannel("chat");
    dataChannelRef.current = dataChannel;
    dataChannel.onopen = handleDataChannelOpen;
    dataChannel.onmessage = handleDataChannelMessage;

    socket.on("connect", handleSocketConnect);
    socket.on("user-connected", handleUserConnected);
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleICECandidate);

    pc.onicecandidate = handleICECandidateEvent;
    pc.ondatachannel = handleDataChannelEvent;

    return () => {
      socket.disconnect();
      pc.close();
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [
    handleDataChannelOpen,
    handleDataChannelMessage,
    handleSocketConnect,
    handleUserConnected,
    handleOffer,
    handleAnswer,
    handleICECandidate,
    handleICECandidateEvent,
    handleDataChannelEvent,
    setupRemoteVideo,
  ]);

  const sendMessage = useCallback(() => {
    if (dataChannelRef.current && dataChannelRef.current.readyState === "open") {
      dataChannelRef.current.send(message);
      setMessages((prevMessages) => [
        ...prevMessages,
        { sender: "You", text: message },
      ]);
      setMessage("");
    } else {
      console.error("Data channel is not open");
    }
  }, [message]);

  return (
    <div className="room-container">
      <header className="room-header">
        <h1 className="room-title">Room: {roomId}</h1>
      </header>

      <main className="main-content">
        <section className="video-section">
          <div className="video-grid">
            <div className="video-wrapper">
              <video ref={localVideoRef} autoPlay muted className="video-element" />
              <div className="video-label">You</div>
              <div className="video-controls">
                <button 
                  onClick={toggleVideo} 
                  className={`control-button ${!isVideoOn ? 'disabled' : ''}`}
                  title={isVideoOn ? 'Turn off video' : 'Turn on video'}
                >
                  <span className="button-icon">
                    {isVideoOn ? '🎥' : '❌'}
                  </span>
                </button>
                <button 
                  onClick={toggleAudio} 
                  className={`control-button ${!isAudioOn ? 'disabled' : ''}`}
                  title={isAudioOn ? 'Mute' : 'Unmute'}
                >
                  <span className="button-icon">
                    {isAudioOn ? '🎤' : '🔇'}
                  </span>
                </button>
              </div>
            </div>
            <div className="video-wrapper">
              <video ref={remoteVideoRef} autoPlay className="video-element" />
              <div className="video-label">Remote User</div>
            </div>
          </div>
          <div className="main-controls">
            <button onClick={startVideo} className="control-button start-call">
              <span className="button-icon">📞</span>
              Start Video Call
            </button>
          </div>
        </section>

        <section className="chat-section">
          <div className="chat-container">
            <h2 className="chat-header">Chat Messages</h2>
            <div className="messages-container">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`message-bubble ${
                    msg.sender === "You" ? "sent" : "received"
                  }`}
                >
                  <span className="message-sender">{msg.sender}</span>
                  <p className="message-text">{msg.text}</p>
                </div>
              ))}
            </div>
            <div className="message-input-container">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="message-input"
                onKeyPress={(e) => e.key === "Enter" && sendMessage()}
              />
              <button onClick={sendMessage} className="send-button">
                <span className="button-icon">📤</span>
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Room;
