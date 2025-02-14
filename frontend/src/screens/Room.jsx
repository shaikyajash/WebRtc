import React, { useCallback, useEffect, useState } from "react";
import { useSocket } from "../context/SocketProvider";

import ReactPlayer from "react-player";
import peer from "../service/peer.js";

const RoomPage = () => {
  const [remoteSocketId, setRemoteSocketId] = useState(null);

  const [myStream, setMyStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);

  const socket = useSocket();

  const handleUserJoined = useCallback((data) => {
    const { email, id } = data;
    console.log(`New user Joined ${email} with id ${id}`);
    setRemoteSocketId(id);
  }, []);

  const handleCallUser = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    const offer = await peer.getOffer();
    socket.emit("user:call", { to: remoteSocketId, offer });
    setMyStream(stream);
  }, [remoteSocketId, socket]);

  const handleIncomingCall = useCallback(async ({ from, offer }) => {
    setRemoteSocketId(from);
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    setMyStream(stream);
    console.log("Incoming Call ", from, offer);
    const ans = await peer.getAnswer(offer);
    socket.emit("call:accepted", { to: from, ans });
  }, []);

  const sendStreams = () => {
    
    for (const track of myStream.getTracks()) {
      peer.peer.addTrack(track, myStream);
    }
  };

  const handleCallAccepted = useCallback(async ({ from, ans }) => {
    await peer.setLocalDescription(ans);

    console.log("Call Accepted!");
    
    sendStreams();
  

    //Now connection is made succesfully between two peers we start sending the stream
  }, [myStream]);

  const handleNegoNeeded = useCallback(async () => {
    const offer = await peer.getOffer();
    socket.emit("peer:nego:needed", { offer, to: remoteSocketId });
  }, [socket, remoteSocketId]);

  useEffect(() => {
    peer.peer.addEventListener("negotiationneeded", handleNegoNeeded);
    return () => {
      peer.peer.removeEventListener("negotiationneeded", handleNegoNeeded);
    };
  }, [handleNegoNeeded, remoteSocketId]);

  useEffect(() => {
    peer.peer.addEventListener("track", async (ev) => {
      const remoteStream = new MediaStream();
      ev.streams[0].getTracks().forEach(track => {
        remoteStream.addTrack(track);
      });
      console.log("Got Tracks");

      setRemoteStream(remoteStream);
    });
  }, []);

  const handleNegoNeedIncoming = useCallback(
    async ({ offer, from }) => {
      const ans = await peer.getAnswer(offer);
      socket.emit("peer:nego:done", { to: from, ans });
    },
    [socket]
  );

  const handleNegoNeedFinal = useCallback(async ({ ans }) => {
    await peer.setLocalDescription(ans);
  }, []);

  useEffect(() => {
    socket.on("user:joined", handleUserJoined);
    socket.on("incomming:call", handleIncomingCall);
    socket.on("call:accepted", handleCallAccepted);
    socket.on("peer:nego:needed", handleNegoNeedIncoming);
    socket.on("peer:nego:final", handleNegoNeedFinal);

    return () => {
      socket.off("user:joined", handleUserJoined);
      socket.off("incomming:call", handleIncomingCall);
      socket.off("call:accepted", handleCallAccepted);
      socket.off("peer:nego:needed", handleNegoNeedIncoming);
      socket.off("peer:nego:final", handleNegoNeedFinal);
    };
  }, [socket, handleUserJoined, handleIncomingCall, handleCallAccepted, handleNegoNeedIncoming, handleNegoNeedFinal]);

  return (
    <div>
      <h1>Room Page</h1>
      <h4>{remoteSocketId ? "SomeOne Joined the Room" : "Not Connected"}</h4>
      {remoteSocketId && <button onClick={handleCallUser}>Call</button>}
      {<button onClick={sendStreams}>Send Streams</button>}
      {myStream && (
        <>
          <h1>My Stream</h1>
          <ReactPlayer
            muted
            playing
            height="300px"
            width="500px"
            url={myStream}
          />
        </>
      )}
      {remoteStream && (
        <>
          <h1>Remote Stream</h1>
          <ReactPlayer
            playing
            height="300px"
            width="500px"
            url={remoteStream}
          />
        </>
      )}
    </div>
  );
};

export default RoomPage;
