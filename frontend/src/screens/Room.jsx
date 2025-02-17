import React, { useRef, useEffect, useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import io from "socket.io-client";
import { gsap } from "gsap";

const SOCKET_SERVER_URL = "http://localhost:5000";
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
  const [isVideoActive, setIsVideoActive] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const roomContainerRef = useRef(null);
  const messageListRef = useRef(null);
  const controlsRef = useRef(null);

  // Function to start local video, add tracks, and renegotiate
  const startVideo = async () => {
    try {
      // Get local media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      // Display the local stream in the video element
      localVideoRef.current.srcObject = stream;

      // Add each track from the stream to the peer connection
      stream.getTracks().forEach((track) => {
        pcRef.current.addTrack(track, stream);
      });

      // Create a new offer to renegotiate the session with the added video/audio tracks
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      socketRef.current.emit("offer", { roomId, offer });
      
      // Update state and animate video elements
      setIsVideoActive(true);
      
      // Animate videos appearing
      gsap.fromTo(
        [localVideoRef.current, remoteVideoRef.current],
        { opacity: 0, scale: 0.8, y: 20 },
        { 
          opacity: 1, 
          scale: 1, 
          y: 0, 
          duration: 0.8, 
          stagger: 0.2,
          ease: "back.out(1.7)" 
        }
      );

    } catch (error) {
      console.error("Error starting video", error);
    }
  };

  // This function is no longer needed as a button click;
  // we now set the ontrack event during initialization.
  const setupRemoteVideo = useCallback(() => {
    pcRef.current.ontrack = (event) => {
      // Display the first stream from the remote peer
      remoteVideoRef.current.srcObject = event.streams[0];
      
      // Animate remote video appearing
      gsap.fromTo(
        remoteVideoRef.current,
        { opacity: 0, scale: 0.8 },
        { opacity: 1, scale: 1, duration: 0.8, ease: "back.out(1.7)" }
      );
    };
  }, []);

  const handleDataChannelOpen = useCallback(() => {
    console.log("Data channel is open");
  }, []);

  const handleDataChannelMessage = useCallback((event) => {
    setMessages((prevMessages) => {
      const newMessages = [...prevMessages, { sender: "Remote", text: event.data }];
      
      // Animate the new message
      setTimeout(() => {
        if (messageListRef.current) {
          const newMessage = messageListRef.current.lastChild;
          if (newMessage) {
            gsap.fromTo(
              newMessage,
              { opacity: 0, x: 20 },
              { opacity: 1, x: 0, duration: 0.5, ease: "power2.out" }
            );
          }
        }
      }, 0);
      
      return newMessages;
    });
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
    
    // Animate the room container appearing
    gsap.fromTo(
      roomContainerRef.current,
      { opacity: 0, y: -30 },
      { opacity: 1, y: 0, duration: 1, ease: "power2.out" }
    );
  }, [roomId]);

  const handleUserConnected = useCallback(
    async (userId) => {
      console.log("User connected:", userId);
      // When a new user joins, create an offer.
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

    // Set up the remote video to display incoming tracks
    setupRemoteVideo();

    // Data channel setup for chat messages
    const dataChannel = pc.createDataChannel("chat");
    dataChannelRef.current = dataChannel;
    dataChannel.onopen = handleDataChannelOpen;
    dataChannel.onmessage = handleDataChannelMessage;

    // Socket event handlers
    socket.on("connect", handleSocketConnect);
    socket.on("user-connected", handleUserConnected);
    socket.on("offer", handleOffer);
    socket.on("answer", handleAnswer);
    socket.on("ice-candidate", handleICECandidate);

    // Peer connection event handlers
    pc.onicecandidate = handleICECandidateEvent;
    pc.ondatachannel = handleDataChannelEvent;

    // Initial animations
    gsap.set(roomContainerRef.current, { opacity: 0, y: -30 });
    gsap.set(controlsRef.current, { opacity: 0, y: 20 });
    
    // Animate controls after slight delay
    gsap.to(controlsRef.current, { 
      opacity: 1, 
      y: 0, 
      duration: 0.8, 
      delay: 0.5,
      ease: "power2.out" 
    });

    return () => {
      socket.disconnect();
      pc.close();
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
    if (
      dataChannelRef.current &&
      dataChannelRef.current.readyState === "open" &&
      message.trim()
    ) {
      dataChannelRef.current.send(message);
      setMessages((prevMessages) => {
        const newMessages = [
          ...prevMessages,
          { sender: "You", text: message },
        ];
        
        // Animate the new message
        setTimeout(() => {
          if (messageListRef.current) {
            const newMessage = messageListRef.current.lastChild;
            if (newMessage) {
              gsap.fromTo(
                newMessage,
                { opacity: 0, x: -20 },
                { opacity: 1, x: 0, duration: 0.5, ease: "power2.out" }
              );
            }
          }
        }, 0);
        
        return newMessages;
      });
      setMessage("");
      
      // Animate input field
      gsap.fromTo(
        document.querySelector('input[type="text"]'),
        { scale: 1.03, borderColor: "#4CAF50" },
        { scale: 1, borderColor: "#ccc", duration: 0.3, ease: "power2.out" }
      );
    } else {
      console.error("Data channel is not open or message is empty");
    }
  }, [message]);

  // Handle Enter key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      sendMessage();
    }
  };

  return (
    <div ref={roomContainerRef} className="room-container" style={{ textAlign: "center", maxWidth: "1000px", margin: "auto", padding: "20px" }}>
      <h1 style={{ marginBottom: "30px", background: "linear-gradient(45deg, #2196F3, #4CAF50)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
        Room: {roomId}
      </h1>
      
      <div ref={controlsRef} className="video-controls" style={{ marginBottom: "30px" }}>
        <button 
          onClick={startVideo}
          disabled={isVideoActive}
          style={{
            padding: "10px 20px",
            fontSize: "16px",
            backgroundColor: isVideoActive ? "#888" : "#2196F3",
            color: "white",
            border: "none",
            borderRadius: "5px",
            cursor: isVideoActive ? "default" : "pointer",
            boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
            transition: "all 0.3s ease"
          }}
        >
          {isVideoActive ? "Video Started" : "Start Video"}
        </button>
      </div>

      <div className="video-container" style={{ display: "flex", justifyContent: "center", gap: "30px", marginBottom: "40px" }}>
        <div className="video-wrapper" style={{ position: "relative" }}>
          <video 
            ref={localVideoRef} 
            autoPlay 
            muted 
            style={{ 
              width: "350px", 
              height: "250px",
              borderRadius: "12px",
              boxShadow: "0 8px 16px rgba(0,0,0,0.15)",
              backgroundColor: "#f0f0f0",
              objectFit: "cover",
              opacity: isVideoActive ? 1 : 0.5,
            }}
          />
          <div style={{ position: "absolute", bottom: "10px", left: "10px", backgroundColor: "rgba(0,0,0,0.7)", color: "white", padding: "3px 8px", borderRadius: "4px", fontSize: "12px" }}>
            You
          </div>
        </div>
        
        <div className="video-wrapper" style={{ position: "relative" }}>
          <video 
            ref={remoteVideoRef} 
            autoPlay 
            style={{ 
              width: "350px", 
              height: "250px",
              borderRadius: "12px",
              boxShadow: "0 8px 16px rgba(0,0,0,0.15)",
              backgroundColor: "#f0f0f0",
              objectFit: "cover"
            }}
          />
          <div style={{ position: "absolute", bottom: "10px", left: "10px", backgroundColor: "rgba(0,0,0,0.7)", color: "white", padding: "3px 8px", borderRadius: "4px", fontSize: "12px" }}>
            Remote Peer
          </div>
        </div>
      </div>
      
      <div className="chat-container" style={{ maxWidth: "600px", margin: "auto", backgroundColor: "#f9f9f9", padding: "20px", borderRadius: "15px", boxShadow: "0 6px 12px rgba(0,0,0,0.1)" }}>
        <h2 style={{ marginTop: "0", marginBottom: "15px", color: "#2196F3" }}>Chat Messages</h2>
        
        <div className="message-input" style={{ display: "flex", marginBottom: "20px" }}>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message"
            style={{ 
              flex: 1, 
              padding: "10px 15px", 
              fontSize: "16px", 
              borderRadius: "25px", 
              border: "1px solid #ccc",
              outline: "none",
              transition: "border-color 0.3s ease"
            }}
          />
          <button 
            onClick={sendMessage}
            style={{
              marginLeft: "10px",
              padding: "10px 20px",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "25px",
              cursor: "pointer",
              transition: "all 0.3s ease"
            }}
            onMouseEnter={(e) => {
              gsap.to(e.target, { backgroundColor: "#45a049", scale: 1.05, duration: 0.2 });
            }}
            onMouseLeave={(e) => {
              gsap.to(e.target, { backgroundColor: "#4CAF50", scale: 1, duration: 0.2 });
            }}
          >
            Send
          </button>
        </div>
        
        <div className="message-list" style={{ maxHeight: "300px", overflowY: "auto", paddingRight: "10px" }}>
          <ul ref={messageListRef} style={{ listStyleType: "none", padding: 0, margin: 0 }}>
            {messages.map((msg, index) => (
              <li 
                key={index}
                style={{
                  marginBottom: "12px",
                  padding: "10px 15px",
                  borderRadius: msg.sender === "You" ? "18px 18px 0 18px" : "18px 18px 18px 0",
                  backgroundColor: msg.sender === "You" ? "#DCF8C6" : "#EAEAEA",
                  alignSelf: msg.sender === "You" ? "flex-end" : "flex-start",
                  maxWidth: "80%",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                  textAlign: msg.sender === "You" ? "right" : "left",
                  marginLeft: msg.sender === "You" ? "auto" : "0",
                  marginRight: msg.sender === "Remote" ? "auto" : "0",
                  position: "relative",
                  display: "inline-block"
                }}
              >
                <div style={{ fontSize: "12px", color: "#666", marginBottom: "5px" }}>
                  {msg.sender}
                </div>
                <div>{msg.text}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Room;