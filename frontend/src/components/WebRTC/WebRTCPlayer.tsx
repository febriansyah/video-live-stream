import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import './WebRTCPlayer.css';

interface WebRTCPlayerProps {
  serverUrl: string;
}

const WebRTCPlayer: React.FC<WebRTCPlayerProps> = ({ serverUrl }) => {
  const [peers, setPeers] = useState<string[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const socketRef = useRef<Socket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  const peerVideosRef = useRef<Record<string, HTMLVideoElement | null>>({});
  
  // Initialize WebRTC
  useEffect(() => {
    // Connect to signaling server
    socketRef.current = io(serverUrl);
    
    // Get local media stream
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(stream => {
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        
        // Notify server that we're ready to stream
        socketRef.current?.emit('stream-ready');
        setIsConnecting(false);
      })
      .catch(err => {
        console.error('Error accessing media devices:', err);
        setError('Could not access camera or microphone. Please check permissions.');
        setIsConnecting(false);
      });
    
    // Socket event handlers
    socketRef.current.on('peers', (peerIds: string[]) => {
      console.log('Received peers list:', peerIds);
      setPeers(peerIds);
      
      // Create peer connections for existing peers
      peerIds.forEach(peerId => {
        createPeerConnection(peerId, true);
      });
    });
    
    socketRef.current.on('new-peer', (peerId: string) => {
      console.log('New peer connected:', peerId);
      setPeers(prev => [...prev, peerId]);
      
      // Create peer connection for new peer
      createPeerConnection(peerId, false);
    });
    
    socketRef.current.on('signal', (data: { from: string, type: string, data: any }) => {
      console.log('Received signal:', data.type, 'from', data.from);
      
      const pc = peerConnectionsRef.current[data.from];
      if (!pc) {
        console.error('No peer connection for:', data.from);
        return;
      }
      
      if (data.type === 'offer') {
        pc.setRemoteDescription(new RTCSessionDescription(data.data))
          .then(() => pc.createAnswer())
          .then(answer => pc.setLocalDescription(answer))
          .then(() => {
            socketRef.current?.emit('signal', {
              to: data.from,
              type: 'answer',
              data: pc.localDescription
            });
          })
          .catch(err => console.error('Error handling offer:', err));
      } else if (data.type === 'answer') {
        pc.setRemoteDescription(new RTCSessionDescription(data.data))
          .catch(err => console.error('Error handling answer:', err));
      }
    });
    
    socketRef.current.on('ice-candidate', (data: { from: string, candidate: RTCIceCandidateInit }) => {
      console.log('Received ICE candidate from', data.from);
      
      const pc = peerConnectionsRef.current[data.from];
      if (!pc) {
        console.error('No peer connection for:', data.from);
        return;
      }
      
      pc.addIceCandidate(new RTCIceCandidate(data.candidate))
        .catch(err => console.error('Error adding ICE candidate:', err));
    });
    
    socketRef.current.on('peer-disconnected', (peerId: string) => {
      console.log('Peer disconnected:', peerId);
      
      // Clean up peer connection
      if (peerConnectionsRef.current[peerId]) {
        peerConnectionsRef.current[peerId].close();
        delete peerConnectionsRef.current[peerId];
      }
      
      // Remove peer from state
      setPeers(prev => prev.filter(id => id !== peerId));
    });
    
    // Clean up
    return () => {
      // Close all peer connections
      Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
      
      // Stop local stream
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      // Disconnect socket
      socketRef.current?.disconnect();
    };
  }, [serverUrl]);
  
  // Create a peer connection
  const createPeerConnection = (peerId: string, isInitiator: boolean) => {
    if (peerConnectionsRef.current[peerId]) {
      console.log('Peer connection already exists for:', peerId);
      return;
    }
    
    console.log('Creating peer connection for:', peerId, 'isInitiator:', isInitiator);
    
    // Create new peer connection
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
    
    // Store peer connection
    peerConnectionsRef.current[peerId] = pc;
    
    // Add local stream to peer connection
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }
    
    // Handle ICE candidates
    pc.onicecandidate = event => {
      if (event.candidate) {
        socketRef.current?.emit('ice-candidate', {
          to: peerId,
          candidate: event.candidate
        });
      }
    };
    
    // Handle incoming tracks
    pc.ontrack = event => {
      console.log('Received track from:', peerId);
      
      // Create video element for peer if it doesn't exist
      if (!document.getElementById(`peer-${peerId}`)) {
        const videoElement = document.createElement('video');
        videoElement.id = `peer-${peerId}`;
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        videoElement.className = 'peer-video';
        
        const videoContainer = document.getElementById('peer-videos');
        if (videoContainer) {
          videoContainer.appendChild(videoElement);
        }
        
        peerVideosRef.current[peerId] = videoElement;
      }
      
      // Set stream on video element
      const videoElement = peerVideosRef.current[peerId];
      if (videoElement) {
        videoElement.srcObject = event.streams[0];
      }
    };
    
    // If initiator, create offer
    if (isInitiator) {
      pc.createOffer()
        .then(offer => pc.setLocalDescription(offer))
        .then(() => {
          socketRef.current?.emit('signal', {
            to: peerId,
            type: 'offer',
            data: pc.localDescription
          });
        })
        .catch(err => console.error('Error creating offer:', err));
    }
    
    return pc;
  };
  
  return (
    <div className="webrtc-container">
      <h2>WebRTC Video Chat</h2>
      
      {isConnecting ? (
        <div className="connecting-message">
          <p>Connecting to camera and microphone...</p>
        </div>
      ) : error ? (
        <div className="error-message">
          <p>{error}</p>
        </div>
      ) : (
        <div className="video-grid">
          <div className="local-video-container">
            <h3>You</h3>
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="local-video"
            />
          </div>
          
          <div id="peer-videos" className="peer-videos-container">
            {peers.length === 0 && (
              <div className="no-peers-message">
                <p>No other participants yet. Share the link to invite others.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default WebRTCPlayer;
