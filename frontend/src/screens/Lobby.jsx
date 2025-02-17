import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { gsap } from "gsap";

const Lobby = () => {
  const [room, setRoom] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  
  // Refs for animations
  const lobbyContainerRef = useRef(null);
  const titleRef = useRef(null);
  const formRef = useRef(null);
  const inputRef = useRef(null);
  const buttonRef = useRef(null);
  const backgroundRef = useRef(null);

  useEffect(() => {
    // Initial setup - hide elements before animation
    gsap.set([titleRef.current, formRef.current], { opacity: 0, y: -20 });
    
    // Create timeline for entrance animations
    const tl = gsap.timeline();
    
    // Add animations to timeline
    tl.fromTo(
      backgroundRef.current,
      { opacity: 0, scale: 0.95 },
      { opacity: 1, scale: 1, duration: 1, ease: "power2.out" }
    )
    .fromTo(
      titleRef.current,
      { opacity: 0, y: -30 },
      { opacity: 1, y: 0, duration: 0.8, ease: "back.out(1.7)" }
    )
    .fromTo(
      formRef.current,
      { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" },
      "-=0.4" // Start slightly before previous animation finishes
    );
    
    // Random floating animation for background elements
    gsap.to(".floating-element", {
      y: "random(-20, 20)",
      x: "random(-15, 15)",
      rotation: "random(-10, 10)",
      duration: "random(3, 5)",
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      stagger: 0.2
    });
    
    // Clean up animations on unmount (not strictly necessary for this case)
    return () => {
      tl.kill();
    };
  }, []);

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (room.trim()) {
      setIsLoading(true);
      
      // Button press animation
      gsap.to(buttonRef.current, {
        scale: 0.95,
        duration: 0.1,
        onComplete: () => {
          gsap.to(buttonRef.current, {
            scale: 1,
            duration: 0.1
          });
        }
      });
      
      // Form exit animation
      gsap.to(formRef.current, {
        opacity: 0,
        y: -20,
        duration: 0.5,
        ease: "power2.in",
        onComplete: () => {
          // Navigate after animation completes
          navigate(`/room/${room}`);
        }
      });
    }
  };

  const handleInputFocus = () => {
    gsap.to(inputRef.current, {
      boxShadow: "0 0 15px rgba(33, 150, 243, 0.5)",
      duration: 0.3
    });
  };

  const handleInputBlur = () => {
    gsap.to(inputRef.current, {
      boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
      duration: 0.3
    });
  };

  return (
    <div ref={lobbyContainerRef} style={{ 
      height: "100vh", 
      display: "flex", 
      flexDirection: "column", 
      justifyContent: "center", 
      alignItems: "center", 
      backgroundColor: "#f5f8fb",
      overflow: "hidden",
      position: "relative",
    }}>
      {/* Background decoration */}
      <div ref={backgroundRef} className="background-elements" style={{ position: "absolute", width: "100%", height: "100%", zIndex: 0 }}>
        {/* We'll create some floating geometric shapes */}
        <div className="floating-element" style={{ position: "absolute", top: "20%", left: "15%", width: "120px", height: "120px", borderRadius: "30%", background: "rgba(66, 133, 244, 0.1)", filter: "blur(2px)" }}></div>
        <div className="floating-element" style={{ position: "absolute", top: "60%", left: "80%", width: "150px", height: "150px", borderRadius: "30%", background: "rgba(52, 168, 83, 0.1)", filter: "blur(3px)" }}></div>
        <div className="floating-element" style={{ position: "absolute", top: "10%", left: "75%", width: "80px", height: "80px", borderRadius: "30%", background: "rgba(234, 67, 53, 0.1)", filter: "blur(2px)" }}></div>
        <div className="floating-element" style={{ position: "absolute", top: "70%", left: "20%", width: "100px", height: "100px", borderRadius: "30%", background: "rgba(250, 187, 5, 0.1)", filter: "blur(3px)" }}></div>
      </div>
      
      <div style={{ 
        maxWidth: "500px", 
        width: "90%", 
        padding: "40px", 
        backgroundColor: "white", 
        borderRadius: "20px", 
        boxShadow: "0 10px 30px rgba(0, 0, 0, 0.1)",
        textAlign: "center",
        position: "relative",
        zIndex: 1
      }}>
        <h1 
          ref={titleRef} 
          style={{ 
            marginBottom: "30px", 
            color: "#333",
            fontSize: "36px",
            background: "linear-gradient(45deg, #2196F3, #4CAF50)", 
            WebkitBackgroundClip: "text", 
            WebkitTextFillColor: "transparent"
          }}
        >
          Video Chat Lobby
        </h1>
        
        <p style={{ marginBottom: "30px", color: "#666", lineHeight: "1.6" }}>
          Enter a room ID to start or join a video conversation. 
          Share this ID with others so they can join the same room.
        </p>
        
        <form 
          ref={formRef}
          onSubmit={handleJoinRoom}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center"
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            onFocus={handleInputFocus}
            onBlur={handleInputBlur}
            placeholder="Enter Room ID"
            required
            style={{
              width: "100%",
              padding: "15px 20px",
              fontSize: "18px",
              marginBottom: "25px",
              borderRadius: "30px",
              border: "1px solid #ddd",
              outline: "none",
              boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              transition: "all 0.3s ease"
            }}
          />
          
          <button 
            ref={buttonRef}
            type="submit"
            disabled={isLoading}
            style={{
              padding: "15px 35px",
              fontSize: "18px",
              backgroundColor: "#2196F3",
              color: "white",
              border: "none",
              borderRadius: "30px",
              cursor: "pointer",
              boxShadow: "0 4px 8px rgba(33, 150, 243, 0.3)",
              transition: "all 0.3s ease",
              position: "relative",
              overflow: "hidden"
            }}
            onMouseEnter={(e) => {
              gsap.to(e.target, { 
                backgroundColor: "#1976D2", 
                boxShadow: "0 6px 12px rgba(33, 150, 243, 0.4)", 
                scale: 1.05,
                duration: 0.3 
              });
            }}
            onMouseLeave={(e) => {
              gsap.to(e.target, { 
                backgroundColor: "#2196F3", 
                boxShadow: "0 4px 8px rgba(33, 150, 243, 0.3)", 
                scale: 1,
                duration: 0.3 
              });
            }}
          >
            {isLoading ? "Connecting..." : "Join Room"}
          </button>
        </form>
      </div>
      
      <div style={{ 
        marginTop: "20px", 
        color: "#666", 
        fontSize: "14px",
        opacity: 0.7,
        position: "relative",
        zIndex: 1
      }}>
        Powered by WebRTC
      </div>
    </div>
  );
};

export default Lobby;