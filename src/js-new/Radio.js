class Radio {
  options = {
    host: window.location.hostname,
    port: window.location.port,
    onUpdate: () => {}
  };
  stations = [];
  constructor(options) {
    console.log('Radio', this);
    this.options = {...this.options, ...options};
    this.socket = io.connect(`//${this.options.host}:${this.options.port}`);
    this.socket.on('radio.update', (stations) => {
      this.stations = stations;
      this.options.onUpdate(stations);
    });
    this.socket.on('station.update', (station) => {
      console.log('station.update', station);
    });
  }

  add(station) {
    console.log('Radio.add', station);
    station.onStart(() => {
      this.socket.emit('station.start', station);
    });
    this.socket.emit('radio.add', station);
  }

  remove(stationId) {
    console.log('Radio.remove', stationId);
    this.socket.emit('radio.remove', stationId);
  }

  join(station) {
    console.log('Radio.join', station);
    this.station = io('/' + station.id);
    // this.station.on('station.update', () => {
    //   this.stream = this.context.createMediaStreamSource(stream);
    // });
    // this.socket.emit('join', station);
  }

  leave(station) {
    console.log('Radio.leave', station);
    // this.socket.emit('leave', listener);
  }
}
