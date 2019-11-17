class Radio {
  options = {
    host: window.location.hostname,
    port: window.location.port,
  }
  constructor(options) {
    this.options = {...this.options, ...options};
    // this.socket = io.connect(`//${this.options.host}:${this.options.port}`);
    console.log('Radio', this);
  }
}
