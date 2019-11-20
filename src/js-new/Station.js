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
    offer.sdp = this.maybePreferCodec(offer.sdp, 'audio', 'send', 'opus');
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

  // Helper functions from:
  // https://github.com/webrtc/samples/blob/gh-pages/src/content/peerconnection/audio/js/main.js
  maybePreferCodec(sdp, type, dir, codec) {
    const str = `${type} ${dir} codec`;
    if (codec === '') {
      console.log(`No preference on ${str}.`);
      return sdp;
    }
  
    console.log(`Prefer ${str}: ${codec}`);
  
    const sdpLines = sdp.split('\r\n');
  
    // Search for m line.
    const mLineIndex = this.findLine(sdpLines, 'm=', type);
    if (mLineIndex === null) {
      return sdp;
    }
  
    // If the codec is available, set it as the default in m line.
    const codecIndex = this.findLine(sdpLines, 'a=rtpmap', codec);
    console.log('codecIndex', codecIndex);
    if (codecIndex) {
      const payload = this.getCodecPayloadType(sdpLines[codecIndex]);
      if (payload) {
        sdpLines[mLineIndex] = this.setDefaultCodec(sdpLines[mLineIndex], payload);
      }
    }
  
    sdp = sdpLines.join('\r\n');
    return sdp;
  }
  
  // Find the line in sdpLines that starts with |prefix|, and, if specified,
  // contains |substr| (case-insensitive search).
  findLine(sdpLines, prefix, substr) {
    return this.findLineInRange(sdpLines, 0, -1, prefix, substr);
  }
  
  // Find the line in sdpLines[startLine...endLine - 1] that starts with |prefix|
  // and, if specified, contains |substr| (case-insensitive search).
  findLineInRange(sdpLines, startLine, endLine, prefix, substr) {
    const realEndLine = endLine !== -1 ? endLine : sdpLines.length;
    for (let i = startLine; i < realEndLine; ++i) {
      if (sdpLines[i].indexOf(prefix) === 0) {
        if (!substr ||
          sdpLines[i].toLowerCase().indexOf(substr.toLowerCase()) !== -1) {
          return i;
        }
      }
    }
    return null;
  }
  
  // Gets the codec payload type from an a=rtpmap:X line.
  getCodecPayloadType(sdpLine) {
    const pattern = new RegExp('a=rtpmap:(\\d+) \\w+\\/\\d+');
    const result = sdpLine.match(pattern);
    return (result && result.length === 2) ? result[1] : null;
  }
  
  // Returns a new m= line with the specified codec as the first one.
  setDefaultCodec(mLine, payload) {
    const elements = mLine.split(' ');
  
    // Just copy the first three parameters; codec order starts on fourth.
    const newLine = elements.slice(0, 3);
  
    // Put target payload first and copy in the rest.
    newLine.push(payload);
    for (let i = 3; i < elements.length; i++) {
      if (elements[i] !== payload) {
        newLine.push(elements[i]);
      }
    }
    return newLine.join(' ');
  }
}
