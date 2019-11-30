import { Injectable } from '@angular/core';

import { RadioService } from './radio.service';

@Injectable({
  providedIn: 'root'
})
export class ListenerService {
  id: string;
  radio: RadioService;
  audioContext = null;
  incomingMedia = null;
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
    console.log('Listener.init', id, radio, audioContext, incomingMedia);
    this.id = id;
    this.radio = radio;
    this.audioContext = audioContext;
    this.incomingMedia = incomingMedia;
    this.conn = new RTCPeerConnection();
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
      console.log('Listener.open', event, this.id);
    });
    this.conn.addEventListener('datachannel', (event) => {
      console.log('Listener.datachannel', event.channel.label, this.id);
      this.recvChannel = event.channel;
      this.recvChannel.addEventListener('message', (msg: any) => {
        console.log('Listener.message', this.id);
        console.dir(JSON.parse(msg.data));
      });
      this.sendChannel.send(JSON.stringify({ type: 'msg', contents: 'hello' }));
    });
  }

  cleanup() {
    console.log('Listener.cleanup');
    if (this.audioElem) {
      this.audioElem.remove();
    }
    if (this.audioNode) {
      this.audioNode.disconnect();
    }
    if (this.gainNode) {
      this.gainNode.disconnect();
    }
    this.iceCandidates = [];
  }

  disconnect() {
    console.log('Listener.disconnect', this.id);
    this.conn.close();
    this.sendChannel.close();
    this.recvChannel.close();
    this.cleanup();
    this.radio.disconnect(this.id);
  }

  handleIceCandidates(event) {
    console.log('Listener.handleIceCandidates', event);
    if (event.candidate) {
      this.radio.socket.emit('candidate', event.candidate, this.id);
    }
  }

  handleConnectionChange(event) {
    console.log('Listener.handleConnectionChange', event);
    if (event.target.iceConnectionState === 'disconnected') {
      this.disconnect();
    }
  }

  uncacheICECandidates() {
    console.log('Listener.uncacheICECandidates');
    if (!(this.conn && this.conn.remoteDescription && this.conn.remoteDescription.type)) {
      console.warn(`Connection was not in a state for uncaching.`);
      return;
    }
    this.iceCandidates.forEach((candidate) => {
      this.conn.addIceCandidate(candidate);
    });
    this.iceCandidates = [];
  }

  gotRemoteMediaStream(event) {
    console.log('Listener.gotRemoteMediaStream', event);
    const remoteStream = event.streams[0];
    const audioTracks = remoteStream.getAudioTracks();
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
      this.audioContext.resume();
    }
  }
}
