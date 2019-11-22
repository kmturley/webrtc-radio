class Listener {
  id = 'none';

  constructor(id, options) {
    console.log('Listener', id, options);
    this.id = id ? id : this.id;
    this.options = {...this.options, ...options};
    this.connection = new RTCPeerConnection();
  }

  async connect(offer) {
    console.log('Listener.connect', offer);
    await this.connection.setRemoteDescription(offer);
    const desc = await this.connection.createAnswer();
    this.connection.setLocalDescription(desc);
    desc.sdp = Utils.maybePreferCodec(desc.sdp, 'audio', 'send', 'opus');
    return desc;
  }

  disconnect() {
    console.log('Listener.disconnect');
    this.connection.close();
    this.connection = null;
  }
}
