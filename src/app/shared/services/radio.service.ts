import { Injectable } from '@angular/core';
import io from 'socket.io-client';

import { StationModel } from '../models/models';

declare var window: any;

@Injectable({
  providedIn: 'root'
})
export class RadioService {
  context: AudioContext;
  outgoing: MediaStreamAudioDestinationNode;
  incoming: GainNode;
  socket: any;
  ip = window.location.hostname;
  offerOptions = {
    offerToReceiveAudio: 1,
    offerToReceiveVideo: 0
  };
  listeners = {};
  listenerServices = {};
  port = 8080 || window.location.port;
  station: StationModel;
  stations = {};
  stationsJoined = [];

  constructor() {
    console.log('Radio.init');
    window.AudioContext = (window.AudioContext || window.webkitAudioContext);
    this.context = new AudioContext();
    this.outgoing = this.context.createMediaStreamDestination();
    this.incoming = this.context.createGain();
    this.incoming.connect(this.context.destination);
    this.socket = io.connect(`//${this.ip}:${this.port}`);

    this.socket.on('listeners.updated', (listeners: object) => {
      console.log('Radio.listeners.updated', listeners);
      this.listeners = listeners;
    });

    this.socket.on('stations.updated', (stations: object) => {
      console.log('Radio.stations.updated', stations);
      this.stations = stations;
      if (this.station) {
        this.station = this.stations[this.station.id];
      }
    });

    this.socket.on('joined', (stationId: string) => {
      console.log('Radio.joined', stationId);
      this.station = this.stations[stationId];
    });

    this.socket.on('left', (stationId: string) => {
      console.log('Radio.left', stationId);
      this.station = null;
    });

    this.socket.on('listener.joined', async (socketId: string) => {
      if (socketId === this.socket.id) {
        return;
      }
      console.log('Radio.listener.joined', socketId);
      let listener = this.listenerServices[socketId];
      if (listener) {
        this.disconnect(listener.id);
      }
      listener = await this.createListener(socketId, this);
      this.listenerServices[listener.id] = listener;
      listener.offered = true;
      const offer = await listener.conn.createOffer(this.offerOptions);
      await listener.conn.setLocalDescription(offer);
      this.socket.emit('offer', offer, listener.id);
    });

    this.socket.on('listener.left', (socketId: string) => {
      console.log('Radio.listener.left', socketId);
      const listener = this.listenerServices[socketId];
      if (listener) {
        listener.disconnect();
      }
      this.listenerServices[socketId] = null;
    });

    this.socket.on('offer', async (offer: object, socketId: string) => {
      let listener = this.listenerServices[socketId];
      console.log('Radio.offer', offer, socketId);
      if (listener) {
        listener.cleanup();
      } else {
        listener = await this.createListener(socketId, this);
        this.listenerServices[listener.id] = listener;
      }
      listener.answered = true;
      await listener.conn.setRemoteDescription(offer);
      const answer = await listener.conn.createAnswer(this.offerOptions);
      answer.sdp = answer.sdp.replace('useinbandfec=1', 'useinbandfec=1; stereo=1; maxaveragebitrate=510000');
      await listener.conn.setLocalDescription(answer);
      this.socket.emit('answer', answer, socketId);
      listener.uncacheICECandidates();
    });

    this.socket.on('answer', async (answer: object, socketId: string) => {
      console.log('Radio.answer', answer, socketId);
      const listener = this.listenerServices[socketId];
      if (!(listener && listener.offered)) {
        console.warn(`Unexpected answer from ${socketId} to ${this.socket.id}.`);
        return;
      }
      await listener.conn.setRemoteDescription(answer);
      listener.uncacheICECandidates();
    });

    this.socket.on('candidate', async (candidate: object, ownerId: string) => {
      console.log('Radio.candidate', candidate, ownerId);
      const listener = this.listenerServices[ownerId];
      if (!(listener && (listener.offered || listener.answered))) {
        console.warn(`Unexpected ICE candidates from ${ownerId} to ${this.socket.id}.`);
        return;
      }
      const iceCandidate = new RTCIceCandidate(candidate);
      if (listener.conn && listener.conn.remoteDescription && listener.conn.remoteDescription.type) {
        await listener.conn.addIceCandidate(iceCandidate);
      } else {
        listener.iceCandidates.push(iceCandidate);
      }
    });
  }

  async createListener(id, radio) {
    console.log('Radio.createListener', id, radio);
    const localStream = this.outgoing.stream;
    const audioTracks = localStream.getAudioTracks();
    const listener = this.newListener(id, radio, this.context, this.incoming);
    if (audioTracks[0]) {
      listener.conn.addTrack(audioTracks[0], localStream);
    }
    return listener;
  }

  newListener(id: string, radio: any, audioContext: AudioContext, incomingMedia: GainNode): any {
    console.log('newListener', id, radio, audioContext, incomingMedia);
  }

  add(stationId: string) {
    console.log('Radio.add', stationId);
    this.socket.emit('add', stationId);
  }

  remove(stationId: string) {
    console.log('Radio.remove', stationId);
    this.socket.emit('remove', stationId);
  }

  join(stationId: string) {
    console.log('Radio.join', stationId);
    this.socket.emit('join', stationId);
  }

  leave(stationId: string) {
    console.log('Radio.leave', stationId);
    this.socket.emit('leave', stationId);
  }

  start(stationId: string) {
    console.log('Radio.start', stationId);
    this.socket.emit('start', stationId);
  }

  stop(stationId: string) {
    console.log('Radio.stop', stationId);
    this.socket.emit('stop', stationId);
  }

  disconnect(socketId: string) {
    console.log('Radio.disconnect', socketId);
    this.listenerServices[socketId] = null;
  }
}
