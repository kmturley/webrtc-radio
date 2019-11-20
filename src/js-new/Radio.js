class Radio {
  options = {
    host: window.location.hostname,
    port: window.location.port,
    onConnected: () => {},
    onAdded: () => {},
    onRemoved: () => {},
    onJoined: () => {},
    onLeft: () => {},
    onUpdate: () => {},
  };
  constructor(options) {
    console.log('Radio', this);
    this.options = {...this.options, ...options};
    this.socket = io.connect(`//${this.options.host}:${this.options.port}`);
    this.socket.on('radio.connected', this.options.onConnected);
    this.socket.on('radio.added', this.options.onAdded);
    this.socket.on('radio.removed', this.options.onRemoved);
    this.socket.on('radio.joined', this.options.onJoined);
    this.socket.on('radio.left', this.options.onLeft);
    this.socket.on('radio.update', this.options.onUpdate);
  }

  add(station) {
    console.log('Radio.add', station);
    this.socket.emit('radio.add', station);
  }

  remove(stationId) {
    console.log('Radio.remove', stationId);
    this.socket.emit('radio.remove', stationId);
  }

  join(stationId) {
    console.log('Radio.join', stationId);
    this.socket.emit('radio.join', stationId);
  }

  leave(station) {
    console.log('Radio.leave', station);
    this.socket.emit('radio.leave', station);
  }

  start(station, offer) {
    console.log('Radio.start', station, offer);
    this.socket.emit('radio.start', station, offer);
  }

  stop(station, offer) {
    console.log('Radio.stop', station, offer);
    this.socket.emit('radio.stop', station, offer);
  }
}
