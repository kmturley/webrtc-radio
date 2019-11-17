class Socket {
  constructor(ip, port) {
    this.ip = ip;
    this.port = port;
    this.rooms = [];
    this.peers = {};

    this.socket = io.connect(`//${this.ip}:${this.port}`);
    trace(`Created socket.`);
    console.dir(this.socket);

    // This is emitted when this socket successfully creates
    this.socket.on('created', (room, socketId) => {
      trace(`${socketId} successfully created ${room}.`);
      this.rooms.push(room);
    });

    // This is emitted when this socket successfully joins
    this.socket.on('joined', (room, socketId) => {
      trace(`${socketId} successfully joined ${room}.`);
      this.rooms.push(room);
    });

    this.socket.on('full', (room) => {
      console.warn(`Room ${room} is full.`);
    });

    this.socket.on('ipaddr', (ipaddr) => {
      trace(`Server IP address: ${ipaddr}`);
    });

    // This is emitted when someone else joins
    this.socket.on('join', async (socketId) => {
      // Have to ignore our own join
      if (socketId === this.socket.id) {
        return;
      }

      const offerOptions = {
        offerToReceiveAudio: 1,
        offerToReceiveVideo: 0,
        voiceActivityDetection: false
      };
      let peer = this.peers[socketId];

      trace(`'${socketId}' joined.`);

      // Connection already existed
      // Close old one
      if (peer) {
        this.handleDisconnect(peer.id);
      }

      peer = await createPeer(socketId, this);
      this.peers[peer.id] = peer;
      peer.offered = true;
      pc1 = peer.conn;

      trace(`createOffer to ${socketId} started.`);
      let offer = await peer.conn.createOffer(offerOptions);
      await peer.conn.setLocalDescription(offer);
      console.log(peer);
      this.socket.emit('offer', offer, peer.id);
    });

    this.socket.on('offer', async (offer, socketId) => {
      let peer = this.peers[socketId];

      trace(`Offer received from ${socketId}:`);
      console.dir(offer);

      // Peer might exist because of ICE candidates
      if (peer) {
        console.warn(`Peer already existed at offer.`);
        peer.reconnect();
      } else {
        peer = await createPeer(socketId, this);
        this.peers[peer.id] = peer;
      }

      peer.answered = true;

      await peer.conn.setRemoteDescription(offer);
      let answer = await peer.conn.createAnswer(offerOptions);
      console.log('answer.sdp before', answer.sdp);
      // Ensure the SDP contains this
      // a=fmtp:111 minptime=10;useinbandfec=1; stereo=1; maxaveragebitrate=510000
      // More param options found at:
      // https://tools.ietf.org/html/rfc7587
      answer.sdp = answer.sdp.replace('useinbandfec=1', 'useinbandfec=1; stereo=1; maxaveragebitrate=510000');
      console.log('answer.sdp after', answer.sdp);
      await peer.conn.setLocalDescription(answer);
      this.socket.emit('answer', answer, socketId);

      // Restore any cached ICE candidates
      peer.uncacheICECandidates();
    });

    this.socket.on('answer', async (answer, socketId) => {
      let peer = this.peers[socketId];

      // Make sure we're expecting an answer
      if (!(peer && peer.offered)) {
        console.warn(`Unexpected answer from ${socketId} to ${this.socket.id}.`);
        return;
      }

      trace(`Answer received from ${socketId}:`);
      console.dir(answer);

      await peer.conn.setRemoteDescription(answer);

      // Restore any cached ICE candidates
      peer.uncacheICECandidates();
    });

    this.socket.on('candidate', async (candidate, ownerId) => {
      let peer = this.peers[ownerId];

      // Make sure we're expecting candidates
      if (!(peer && (peer.offered || peer.answered))) {
        console.warn(`Unexpected ICE candidates from ${ownerId} to ${this.socket.id}.`);
        return;
      }

      trace(`Received ICE candidate for ${ownerId}.`);

      let iceCandidate = new RTCIceCandidate(candidate);

      // Cache ICE candidates if the connection isn't ready yet
      if (peer.conn && peer.conn.remoteDescription && peer.conn.remoteDescription.type) {
        await peer.conn.addIceCandidate(iceCandidate);
      } else {
        trace(`Cached ICE candidate`);
        peer.iceCandidates.push(iceCandidate);
      }
    });

    this.socket.on('leave', (room, socketId) => {
      let peer = this.peers[socketId];

      if (peer) {
        trace(`${socketId} left ${room}.`);
        peer.disconnect();
      }

      this.peers[socketId] = null;
    });
  }

  joinRoom(room) {
    trace(`Entering room '${room}'...`);
    this.socket.emit('join', room);
  }

  leaveRoom(room) {
    trace(`Leaving room ${room}...`);
    this.socket.emit('leave', room, this.socket.id);

    this.rooms = this.rooms.filter((val) => val !== room);
  }

  leaveAllRooms() {
    this.rooms.forEach((val) => {
      this.leaveRoom(val);
    });
  }

  disconnected(id) {
    this.peers[id] = null;
    trace(`Removed ${id} from peer list.`);
  }
}
