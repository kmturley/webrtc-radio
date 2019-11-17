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
        offerToReceiveVideo: 0
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

      trace(`createOffer to ${socketId} started.`);
      let offer = await peer.conn.createOffer(offerOptions);
      await peer.conn.setLocalDescription(offer);
      this.updateBandwidth(peer.conn, 'unlimited');
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
      await peer.conn.setLocalDescription(answer);
      this.updateBandwidth(peer.conn, 'unlimited');
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

  // Taken from example at:
  // https://github.com/webrtc/samples/blob/gh-pages/src/content/peerconnection/bandwidth/js/main.js
  // and added networkPriority, priority
  updateBandwidth(pc1, bandwidth) {
    // In Chrome, use RTCRtpSender.setParameters to change bandwidth without
    // (local) renegotiation. Note that this will be within the envelope of
    // the initial maximum bandwidth negotiated via SDP.
    if ((adapter.browserDetails.browser === 'chrome' ||
      (adapter.browserDetails.browser === 'firefox' &&
        adapter.browserDetails.version >= 64)) &&
      'RTCRtpSender' in window &&
      'setParameters' in window.RTCRtpSender.prototype) {
      const sender = pc1.getSenders()[0];
      const parameters = sender.getParameters();
      if (!parameters.encodings) {
        parameters.encodings = [{}];
      }
      if (bandwidth === 'unlimited') {
        delete parameters.encodings[0].maxBitrate;
        parameters.encodings[0].networkPriority = 'high';
        parameters.encodings[0].priority = 'high';
      } else {
        parameters.encodings[0].maxBitrate = bandwidth * 1000;
      }
      sender.setParameters(parameters)
        .then(() => {
          console.log('parameters', parameters);
        })
        .catch(e => console.error(e));
      return;
    }
    // Fallback to the SDP munging with local renegotiation way of limiting
    // the bandwidth.
    pc1.createOffer()
      .then(offer => pc1.setLocalDescription(offer))
      .then(() => {
        const desc = {
          type: pc1.remoteDescription.type,
          sdp: bandwidth === 'unlimited'
            ? removeBandwidthRestriction(pc1.remoteDescription.sdp)
            : updateBandwidthRestriction(pc1.remoteDescription.sdp, bandwidth)
        };
        console.log('Applying bandwidth restriction to setRemoteDescription:\n' +
          desc.sdp);
        return pc1.setRemoteDescription(desc);
      })
      .then(() => {
        bandwidthSelector.disabled = false;
      })
      .catch(onSetSessionDescriptionError);
  }

  updateBandwidthRestriction(sdp, bandwidth) {
    let modifier = 'AS';
    if (adapter.browserDetails.browser === 'firefox') {
      bandwidth = (bandwidth >>> 0) * 1000;
      modifier = 'TIAS';
    }
    if (sdp.indexOf('b=' + modifier + ':') === -1) {
      // insert b= after c= line.
      sdp = sdp.replace(/c=IN (.*)\r\n/, 'c=IN $1\r\nb=' + modifier + ':' + bandwidth + '\r\n');
    } else {
      sdp = sdp.replace(new RegExp('b=' + modifier + ':.*\r\n'), 'b=' + modifier + ':' + bandwidth + '\r\n');
    }
    return sdp;
  }
  
  removeBandwidthRestriction(sdp) {
    return sdp.replace(/b=AS:.*\r\n/, '').replace(/b=TIAS:.*\r\n/, '');
  }
}
