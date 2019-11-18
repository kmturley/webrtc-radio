class Listener {
  id = this.createId();

  constructor(options) {
    this.options = {...this.options, ...options};
    console.log('Listener', this);
    this.connection = new RTCPeerConnection();
  }

  async connect(originalOffer) {
    await this.connection.setRemoteDescription(originalOffer);
    const newOffer = await this.connection.createAnswer(originalOffer);
    return this.connection.setLocalDescription(newOffer);
  }

  createId() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  }
}
