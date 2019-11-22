class Station {
  id = 'none';
  listeners = {};
  options = {
    constraints: {
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
    },
    offerOptions: {
      offerToReceiveAudio: 1,
      offerToReceiveVideo: 0,
      voiceActivityDetection: false
    },
    onStart: () => {},
    onStop: () => {}
  }
  constructor(id, options) {
    this.id = id ? id : this.id;
    this.options = {...this.options, ...options};
    console.log('Station', this);
    const AudioContext = (window.AudioContext || window.webkitAudioContext);
    this.context = new AudioContext();
  }

  async start() {
    console.log('Station.start');
    this.connection = new RTCPeerConnection();
    this.stream = await navigator.mediaDevices.getUserMedia(this.options.constraints);
    this.stream.getTracks().forEach((track) => {
      this.connection.addTrack(track, this.stream);
    });
    const offer = await this.connection.createOffer(this.options.offerOptions);
    await this.connection.setLocalDescription(offer);
    offer.sdp = Utils.maybePreferCodec(offer.sdp, 'audio', 'send', 'opus');
    this.options.onStart(offer);
  }

  async stop() {
    console.log('Station.stop');
    this.stream.getTracks().forEach((track) => {
      track.stop();
    });
    this.connection.close();
    this.connection = null;
    this.options.onStop();
  }

  async connect(returnOffer) {
    console.log('Station.connect', returnOffer);
    return await this.connection.setRemoteDescription(returnOffer);
  }
}
