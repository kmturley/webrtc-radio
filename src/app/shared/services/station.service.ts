import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class StationService {
  recording = false;
  context: AudioContext;
  constraints = {
    audio: {
      autoGainControl: false,
      channelCount: 2,
      echoCancellation: false,
      latency: 0,
      noiseSuppression: false,
      sampleRate: 48000,
      sampleSize: 16,
      volume: 1.0
    }
  };
  mySource: MediaStreamAudioSourceNode;
  outgoingGain: GainNode;

  constructor(context: AudioContext, outgoingDestNode: MediaStreamAudioDestinationNode) {
    console.log('Station.init', context, outgoingDestNode);
    this.context = context;
    this.outgoingGain = this.context.createGain();
    this.outgoingGain.connect(outgoingDestNode);
  }

  async start() {
    return new Promise((resolve, reject) => {
      console.log('Station.start');
      navigator.mediaDevices.getUserMedia(this.constraints).then((stream: MediaStream) => {
        this.stop();
        this.mySource = this.context.createMediaStreamSource(stream);
        this.mySource.connect(this.outgoingGain);
        this.recording = true;
        resolve();
      }).catch((e) => {
        console.warn(`Failed to obtain local media stream: ${e}`);
        reject();
      });
    });
  }

  stop() {
    console.log('Station.stop');
    if (this.mySource) {
      this.mySource.disconnect();
    }
    this.recording = false;
  }
}
