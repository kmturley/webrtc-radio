import io from 'socket.io-client';
import { Listener } from './Listener';

export class Radio {
  ip = window.location.hostname;
  offerOptions = {
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 0
  };
  listeners = {};
  port = 8080 || window.location.port;
  stations = [];

  constructor() {
    window.AudioContext = (window.AudioContext || window.webkitAudioContext);
    this.context = new AudioContext();
    this.outgoing = this.context.createMediaStreamDestination();
    this.incoming = this.context.createGain();
    this.incoming.connect(this.context.destination);

    this.socket = io.connect(`//${this.ip}:${this.port}`);
    this.trace(`Created socket.`);

    this.socket.on('created', (stationId, socketId) => {
      this.trace(`${socketId} successfully created ${stationId}.`);
      this.stations.push(stationId);
    });

    this.socket.on('joined', (stationId, socketId) => {
      this.trace(`${socketId} successfully joined ${stationId}.`);
      this.stations.push(stationId);
    });

    this.socket.on('full', (stationId) => {
      console.warn(`Station ${stationId} is full.`);
    });

    this.socket.on('ipaddr', (ipaddr) => {
      this.trace(`Server IP address: ${ipaddr}`);
    });

    this.socket.on('join', async (socketId) => {
      if (socketId === this.socket.id) {
        return;
      }
      let listener = this.listeners[socketId];
      this.trace(`'${socketId}' joined.`);
      if (listener) {
        this.handleDisconnect(listener.id);
      }
      listener = await this.createListener(socketId, this);
      this.listeners[listener.id] = listener;
      listener.offered = true;
      this.trace(`createOffer to ${socketId} started.`);
      let offer = await listener.conn.createOffer(this.offerOptions);
      await listener.conn.setLocalDescription(offer);
      this.socket.emit('offer', offer, listener.id);
    });

    this.socket.on('offer', async (offer, socketId) => {
      let listener = this.listeners[socketId];
      this.trace(`Offer received from ${socketId}:`);
      if (listener) {
        console.warn(`Listener already existed at offer.`);
        listener.reconnect();
      } else {
        listener = await this.createListener(socketId, this);
        this.listeners[listener.id] = listener;
      }
      listener.answered = true;
      await listener.conn.setRemoteDescription(offer);
      let answer = await listener.conn.createAnswer(this.offerOptions);
      answer.sdp = answer.sdp.replace('useinbandfec=1', 'useinbandfec=1; stereo=1; maxaveragebitrate=510000');
      await listener.conn.setLocalDescription(answer);
      this.socket.emit('answer', answer, socketId);
      listener.uncacheICECandidates();
    });

    this.socket.on('answer', async (answer, socketId) => {
      let listener = this.listeners[socketId];
      if (!(listener && listener.offered)) {
        console.warn(`Unexpected answer from ${socketId} to ${this.socket.id}.`);
        return;
      }
      this.trace(`Answer received from ${socketId}:`);
      await listener.conn.setRemoteDescription(answer);
      listener.uncacheICECandidates();
    });

    this.socket.on('candidate', async (candidate, ownerId) => {
      let listener = this.listeners[ownerId];
      if (!(listener && (listener.offered || listener.answered))) {
        console.warn(`Unexpected ICE candidates from ${ownerId} to ${this.socket.id}.`);
        return;
      }
      this.trace(`Received ICE candidate for ${ownerId}.`);
      let iceCandidate = new RTCIceCandidate(candidate);
      if (listener.conn && listener.conn.remoteDescription && listener.conn.remoteDescription.type) {
        await listener.conn.addIceCandidate(iceCandidate);
      } else {
        this.trace(`Cached ICE candidate`);
        listener.iceCandidates.push(iceCandidate);
      }
    });

    this.socket.on('leave', (stationId, socketId) => {
      let listener = this.listeners[socketId];
      if (listener) {
        this.trace(`${socketId} left ${stationId}.`);
        listener.disconnect();
      }
      this.listeners[socketId] = null;
    });
  }

  trace(text) {
    text = text.trim();
    const now = (performance.now() / 1000).toFixed(3);
    console.log(now, text);
  }

  async createListener(id, radio) {
    this.trace(`Starting connection to ${id}...`);
    let localStream = this.outgoing.stream;
    let audioTracks = localStream.getAudioTracks();
    this.trace(`Audio tracks:`);
    if (audioTracks.length > 0) {
      this.trace(`Using audio device: ${audioTracks[0].label}.`);
    }
    let listener = new Listener(id, radio, this.context, this.incoming);
    if (audioTracks[0]) {
      listener.conn.addTrack(audioTracks[0], localStream);
    }
    return listener;
  }

  join(stationId) {
    this.trace(`Entering station '${stationId}'...`);
    this.socket.emit('join', stationId);
  }

  leave(stationId) {
    this.trace(`Leaving station ${stationId}...`);
    this.socket.emit('leave', stationId);
    this.stations = this.stations.filter((val) => val !== stationId);
  }

  leaveAll() {
    this.stations.forEach((stationId) => {
      this.leave(stationId);
    });
  }

  disconnected(id) {
    this.listeners[id] = null;
    this.trace(`Removed ${id} from listener list.`);
  }
}
