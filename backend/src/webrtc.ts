import { Server } from 'socket.io';
import http from 'http';

export function setupWebRTC(server: http.Server) {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  // Store connected peers
  const peers: Record<string, any> = {};

  io.on('connection', (socket) => {
    console.log('New WebRTC client connected:', socket.id);
    
    // Add the new peer to our list
    peers[socket.id] = {
      id: socket.id,
      socket: socket
    };

    // Send the new peer a list of all existing peers
    const peerIds = Object.keys(peers).filter(id => id !== socket.id);
    socket.emit('peers', peerIds);

    // Notify all existing peers about the new peer
    socket.broadcast.emit('new-peer', socket.id);

    // Handle signaling messages
    socket.on('signal', (data) => {
      console.log('Signal received:', data.type, 'from', socket.id, 'to', data.to);
      
      // Forward the signal to the target peer
      if (peers[data.to]) {
        peers[data.to].socket.emit('signal', {
          from: socket.id,
          type: data.type,
          data: data.data
        });
      }
    });

    // Handle ICE candidates
    socket.on('ice-candidate', (data) => {
      console.log('ICE candidate from', socket.id, 'to', data.to);
      
      // Forward the ICE candidate to the target peer
      if (peers[data.to]) {
        peers[data.to].socket.emit('ice-candidate', {
          from: socket.id,
          candidate: data.candidate
        });
      }
    });

    // Handle stream info
    socket.on('stream-ready', () => {
      console.log('Stream ready from', socket.id);
      socket.broadcast.emit('peer-stream-ready', socket.id);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      
      // Remove the peer from our list
      delete peers[socket.id];
      
      // Notify all other peers about the disconnection
      socket.broadcast.emit('peer-disconnected', socket.id);
    });
  });

  return io;
}
