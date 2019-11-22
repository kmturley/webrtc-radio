class Radio {
  options = {
    host: window.location.hostname,
    port: window.location.port,
    onConnected: () => {},
    onAdded: () => {},
    onRemoved: () => {},
    onJoined: () => {},
    onLeft: () => {},
    onStarted: () => {},
    onStopped: () => {},
    onListening: () => {},
    onUpdated: () => {},
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
    this.socket.on('radio.started', this.options.onStarted);
    this.socket.on('radio.stopped', this.options.onStopped);
    this.socket.on('radio.listening', this.options.onListening);
    this.socket.on('radio.updated', this.options.onUpdated);
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

  leave(stationId) {
    console.log('Radio.leave', stationId);
    this.socket.emit('radio.leave', stationId);
  }

  start(stationId, offer) {
    console.log('Radio.start', stationId, offer);
    this.socket.emit('radio.start', stationId, offer);
  }

  stop(stationId, offer) {
    console.log('Radio.stop', stationId, offer);
    this.socket.emit('radio.stop', stationId, offer);
  }

  listen(stationId, desc) {
    console.log('Radio.listen', stationId, desc);
    this.socket.emit('radio.listen', stationId, desc);
  }
}
