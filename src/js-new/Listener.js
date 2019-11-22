class Listener {
  id = 'none';

  constructor(id, options) {
    console.log('Listener', id, options);
    this.id = id ? id : this.id;
    this.options = {...this.options, ...options};
    this.connection = new RTCPeerConnection();
  }

  async connect(originalOffer) {
    await this.connection.setRemoteDescription(originalOffer);
    const newOffer = await this.connection.createAnswer(originalOffer);
    return this.connection.setLocalDescription(newOffer);
  }
}
