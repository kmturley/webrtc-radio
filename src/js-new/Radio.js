class Radio {
  options = {
    host: window.location.hostname,
    port: window.location.port,
    onRadioUpdate: () => {},
    onStationUpdate: () => {}
  };
  sockets = {
    radio: null,
    station: null
  };
  constructor(options) {
    console.log('Radio', this);
    this.options = {...this.options, ...options};
    this.sockets.radio = io.connect(`//${this.options.host}:${this.options.port}`);
    this.sockets.radio.on('radio.update', this.options.onRadioUpdate);
  }

  add(station) {
    console.log('Radio.add', station);
    this.sockets.radio.emit('radio.add', station);
  }

  remove(stationId) {
    console.log('Radio.remove', stationId);
    this.sockets.radio.emit('radio.remove', stationId);
  }

  join(station) {
    console.log('Radio.join', station);
    this.sockets.station = io('/' + station.id);
    this.sockets.station.on('station.update', this.options.onStationUpdate);
    // this.sockets.station.on('station.update', (station) => {
    //   // this.stream = this.context.createMediaStreamSource(stream);
    //   console.log('station.update', station);
    // });
    // this.sockets.station.emit('station.join', station);
  }

  leave(station) {
    console.log('Radio.leave', station);
    this.sockets.station.emit('station.leave', station);
  }

  start(station, offer) {
    console.log('Radio.start', station, offer);
    this.sockets.station.emit('station.start', station, offer);
  }

  stop(station, offer) {
    console.log('Radio.stop', station, offer);
    this.sockets.station.emit('station.stop', station, offer);
  }
}
