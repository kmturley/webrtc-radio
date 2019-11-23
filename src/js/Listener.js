class Listener {
  offered = false;
  answered = false;
  conn = null;
  sendChannel = null;
  recvChannel = null;
  iceCandidates = [];
  titleElem = null;
  audioElem = null;
  audioNode = null;
  gainNode = null;
  muteButton = null;

  constructor(id, radio, audioContext, incomingMedia) {
    this.id = id;
    this.radio = radio;
    this.audioContext = audioContext;
    this.incomingMedia = incomingMedia;
    this.conn = new RTCPeerConnection(null, {});
    this.trace('Created local connection object RTCPeerConnection.');
    this.conn.addEventListener('icecandidate', (event) => {
      this.handleIceCandidates(event);
    });
    this.conn.addEventListener('iceconnectionstatechange', (event) => {
      this.handleConnectionChange(event);
    });
    this.conn.addEventListener('track', (event) => {
      this.gotRemoteMediaStream(event);
    });
    this.sendChannel = this.conn.createDataChannel('session-info');
    this.sendChannel.addEventListener('open', (event) => {
      this.trace(`Data channel to ${this.id} opened.`);
    });
    this.conn.addEventListener('datachannel', (event) => {
      this.trace(`Received data channel '${event.channel.label}' from ${this.id}.`);
      this.recvChannel = event.channel;
      this.recvChannel.addEventListener('message', (event) => {
        this.trace(`Message received from ${this.id}:`);
        console.dir(JSON.parse(event.data));
      });
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
    if (this.muteButton) {
      this.muteButton.remove();
    }
    this.iceCandidates = [];
  }

  trace(text) {
    text = text.trim();
    const now = (performance.now() / 1000).toFixed(3);
    console.log(now, text);
  }

  reconnect() {
    this.cleanup();
  }

  disconnect() {
    this.conn.close();
    this.sendChannel.close();
    this.recvChannel.close();
    this.cleanup();
    this.radio.disconnected(this.id);
    this.trace(`Disconnected from ${this.id}.`);
  }

  handleIceCandidates(event) {
    if (event.candidate) {
      this.radio.socket.emit('candidate', event.candidate, this.id);
      this.trace(`Sent ICE candidate to ${this.id}.`);
    }
  }

  handleConnectionChange(event) {
    this.trace(`ICE state changed to: ${event.target.iceConnectionState}.`);
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
      this.trace(`Added cached ICE candidate`);
      this.conn.addIceCandidate(candidate);
    });
    this.iceCandidates = [];
  }

  gotRemoteMediaStream(event) {
    const stationListeners = document.getElementById('stationListeners');
    let remoteStream = event.streams[0];
    let audioTracks = remoteStream.getAudioTracks();
    if (!this.titleElem) {
      this.titleElem = document.createElement('h3');
      this.titleElem.innerHTML = `${this.id}:`;
      stationListeners.appendChild(this.titleElem);
    }
    if (audioTracks.length > 0) {
      let audioElem = new Audio();
      audioElem.autoplay = true;
      audioElem.controls = true;
      audioElem.muted = true;
      audioElem.srcObject = remoteStream;
      audioElem.addEventListener('canplaythrough', () => {
        audioElem.pause();
        audioElem = null;
      });
      this.gainNode = this.audioContext.createGain();
      this.gainNode.connect(this.incomingMedia);
      this.audioNode = this.audioContext.createMediaStreamSource(remoteStream);
      this.audioNode.connect(this.gainNode);
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
      stationListeners.appendChild(this.muteButton);
      this.audioContext.resume();
    }
    this.trace(`Received remote stream from ${this.id}.`);
  }
}
