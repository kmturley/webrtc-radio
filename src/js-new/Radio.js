class Radio {
  options = {
    host: window.location.hostname,
    port: window.location.port,
    onStations: () => {}
  };
  stations = [];
  constructor(options) {
    console.log('Radio', this);
    this.options = {...this.options, ...options};
    this.socket = io.connect(`//${this.options.host}:${this.options.port}`);
    this.socket.on('stations', (stations) => {
      this.stations = stations;
      this.options.onStations(stations);
    });
  }

  join(station) {
    console.log('Radio.join', station);
    this.station = io('/' + station.id);
    // this.socket.emit('join', station);
  }

  leave(station) {
    console.log('Radio.leave', station);
    // this.socket.emit('leave', listener);
  }

  add(station) {
    console.log('Radio.add', station);
    this.socket.emit('stations.add', station);
  }

  remove(stationId) {
    console.log('Radio.remove', stationId);
    this.socket.emit('stations.remove', stationId);
  }
}
