class Peer {
  constructor(id, socket) {
    this.id = id;
    this.socket = socket; // This is our class wrapped socket. Not socket.io socket
    this.initiated = false;
    this.offered = false;
    this.answered = false;
    this.conn = null;
    this.sendChannel = null;
    this.recvChannel = null;
    this.iceCandidates = [];
    this.remoteStream = null;
    this.titleElem = null;
    this.audioElem = null;
    this.videoElem = null;
    this.audioNode = null;
    this.gainNode = null;
    this.muteButton = null;

    this.conn = new RTCPeerConnection(null, {});
    trace('Created local peer connection object localPeerConnection.');

    // Use arrow function so that 'this' is available in class methods
    this.conn.addEventListener('icecandidate', (event) => {
      this.handleIceCandidates(event);
    });
    this.conn.addEventListener('iceconnectionstatechange', (event) => {
      this.handleConnectionChange(event);
    });
    this.conn.addEventListener('track', (event) => {
      this.gotRemoteMediaStream(event);
    });

    // Set up additional data channel to pass messages peer-to-peer
    // There is a separate channel for sending and receiving
    this.sendChannel = this.conn.createDataChannel('session-info');
    this.sendChannel.addEventListener('open', (event) => {
      trace(`Data channel to ${this.id} opened.`);
    });

    this.conn.addEventListener('datachannel', (event) => {
      trace(`Received data channel '${event.channel.label}' from ${this.id}.`);
      this.recvChannel = event.channel;

      this.recvChannel.addEventListener('message', (event) => {
        trace(`Message received from ${this.id}:`);
        console.dir(JSON.parse(event.data));
      });

      // Send an initial message
      this.sendChannel.send(JSON.stringify({ type: 'msg', contents: 'hello' }));
    });
  }

  cleanup() {
    if (this.titleElem) {
      this.titleElem.remove();
    }

    if (this.audioElem) {
      this.audioElem.remove();
    }

    if (this.audioNode) {
      this.audioNode.disconnect();
    }

    if (this.gainNode) {
      this.gainNode.disconnect();
    }

    if (this.videoElem) {
      this.videoElem.remove();
    }

    if (this.muteButton) {
      this.muteButton.remove();
    }

    this.iceCandidates = [];
  }

  reconnect() {
    this.cleanup();
  }

  disconnect() {
    this.conn.close();
    this.sendChannel.close();
    this.recvChannel.close();

    this.cleanup();

    // TODO: This is meh coupling
    this.socket.disconnected(this.id);
    trace(`Disconnected from ${this.id}.`);
  }

  // Connects with new peer candidate.
  handleIceCandidates(event) {
    if (event.candidate) {
      this.socket.socket.emit('candidate', event.candidate, this.id);
      trace(`Sent ICE candidate to ${this.id}.`);
    }
  }

  // Logs changes to the connection state.
  handleConnectionChange(event) {
    trace(`ICE state changed to: ${event.target.iceConnectionState}.`);

    if (event.target.iceConnectionState === 'disconnected') { // || event.target.iceConnectionState === 'closed' || event.target.iceConnectionState === 'failed') {
      this.disconnect();
    }
  }

  uncacheICECandidates() {
    if (!(this.conn && this.conn.remoteDescription && this.conn.remoteDescription.type)) {
      console.warn(`Connection was not in a state for uncaching.`);
      return;
    }

    this.iceCandidates.forEach((candidate) => {
      trace(`Added cached ICE candidate`);
      this.conn.addIceCandidate(candidate);
    });

    this.iceCandidates = [];
  }

  // Handles remote MediaStream success by adding it as the remoteVideo src.
  gotRemoteMediaStream(event) {
    this.remoteStream = event.streams[0];

    let videoTracks = this.remoteStream.getVideoTracks();
    let audioTracks = this.remoteStream.getAudioTracks();

    // If we have a video stream and separate audio stream,
    // we'll get multiple 'track' events
    // Make sure the title only gets added once
    if (!this.titleElem) {
      this.titleElem = document.createElement('h3');
      this.titleElem.innerHTML = `${this.id}:`;
      remoteMedia.appendChild(this.titleElem);
    }

    // Make sure we actually have audio tracks
    if (audioTracks.length > 0) {
      // TODO: This needs more investigation
      // The MediaStream node doesn't produce audio until an HTML audio element is attached to the stream
      // Pause and remove the element after loading since we only need it to trigger the stream
      // See https://stackoverflow.com/questions/24287054/chrome-wont-play-webaudio-getusermedia-via-webrtc-peer-js
      // and https://bugs.chromium.org/p/chromium/issues/detail?id=121673#c121
      let audioElem = new Audio();
      audioElem.autoplay = true;
      audioElem.controls = true;
      audioElem.muted = true;
      audioElem.srcObject = this.remoteStream;
      audioElem.addEventListener('canplaythrough', () => {
        audioElem.pause();
        audioElem = null;
      });

      // Gain node for this stream only
      // Connected to gain node for all remote streams
      this.gainNode = context.createGain();
      this.gainNode.connect(incomingRemoteGainNode);

      this.audioNode = context.createMediaStreamSource(this.remoteStream);
      this.audioNode.connect(this.gainNode);

      // Setup mute button logic
      this.muteButton = document.createElement('button');
      this.muteButton.innerHTML = 'Mute';
      this.muteButton.addEventListener('click', () => {
        if (this.muteButton.innerHTML === 'Mute') {
          this.gainNode.gain.value = 0;
          this.muteButton.innerHTML = 'Unmute';
        } else {
          this.gainNode.gain.value = 1;
          this.muteButton.innerHTML = 'Mute';
        }
      });

      remoteMedia.appendChild(this.muteButton);

      // AudioContext gets suspended if created before
      // a user interaction https://goo.gl/7K7WLu
      context.resume();
    }

    // Do video if we should
    if (showVideo && videoTracks.length > 0) {
      this.videoElem = document.createElement('video');
      this.videoElem.classList.add('remoteVideo');
      this.videoElem.autoplay = true;
      this.videoElem.controls = true;
      this.videoElem.muted = true;
      this.videoElem.srcObject = this.remoteStream;

      remoteMedia.appendChild(this.videoElem);
    }

    trace(`Received remote stream from ${this.id}.`);
  }
}
