import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ListenerService {
  id: string;
  radio: any;
  audioContext: AudioContext;
  incomingMedia: GainNode;
  offered = false;
  answered = false;
  conn: RTCPeerConnection;
  sendChannel: RTCDataChannel;
  recvChannel: any;
  iceCandidates = [];
  audioElem: HTMLAudioElement;
  audioNode: MediaStreamAudioSourceNode;
  gainNode: GainNode;
  playing = false;

  constructor(id: string, radio: any, audioContext: AudioContext, incomingMedia: GainNode) {
    console.log('Listener.init', id, radio, audioContext, incomingMedia);
    this.id = id;
    this.radio = radio;
    this.audioContext = audioContext;
    this.incomingMedia = incomingMedia;
    this.conn = new RTCPeerConnection();
    this.conn.addEventListener('icecandidate', (event: any) => {
      this.handleIceCandidates(event);
    });
    this.conn.addEventListener('iceconnectionstatechange', (event: any) => {
      this.handleConnectionChange(event);
    });
    this.conn.addEventListener('track', (event: any) => {
      this.gotRemoteMediaStream(event);
    });
    this.sendChannel = this.conn.createDataChannel('session-info');
    this.sendChannel.addEventListener('open', (event) => {
      console.log('Listener.open', event, this.id);
    });
    this.conn.addEventListener('datachannel', (event: any) => {
      console.log('Listener.datachannel', event.channel.label, this.id);
      this.recvChannel = event.channel;
      this.recvChannel.addEventListener('message', (msg: any) => {
        console.log('Listener.message', this.id, JSON.parse(msg.data));
      });
      this.sendChannel.send(JSON.stringify({type: 'msg', contents: 'hello'}));
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
    if (this.recvChannel) {
      this.recvChannel.close();
    }
    this.cleanup();
    this.radio.disconnect(this.id);
    this.playing = false;
  }

  handleIceCandidates(event: any) {
    console.log('Listener.handleIceCandidates', event);
    if (event.candidate) {
      this.radio.socket.emit('candidate', event.candidate, this.id);
    }
  }

  handleConnectionChange(event: any) {
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

  gotRemoteMediaStream(event: any) {
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
      this.playing = true;
    }
  }
}
