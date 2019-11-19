const fs = require('fs');
const os = require('os');

const hostname = '0.0.0.0';
const keys = './keys';
const port = 8080;
const protocol = 'https';
const root = '/src';

let radio = {
  listeners: [],
  stations: []
};

function createServer(proto, handler) {
  if (proto === 'https') {
    return require('https').createServer({
      key: fs.readFileSync(`${keys}/client-key.pem`),
      cert: fs.readFileSync(`${keys}/client-cert.pem`)
    }, handler);
  } else {
    return require('http').createServer(handler);
  }
}

function handleRequest(req, res) {
  if (req.url === '/') {
    req.url = '/index-new.html';
  }
  console.log(`server: ${req.url}`);
  fs.readFile(__dirname + root + req.url, function (err, data) {
    if (err) {
      res.writeHead(404);
      res.end(JSON.stringify(err));
      return;
    }
    res.writeHead(200);
    res.end(data);
  });
}

function stationConnection(socket) {
  const station = getStation(socket.nsp.name.slice(1));
  console.log('station.connect', socket.conn.id);

  socket.on('station.start', (station, offer) => {
    console.log('station.start', station, offer);
    // io.emit('station.update', station, offer);
  });

  socket.on('station.stop', (station, offer) => {
    console.log('station.stop', station, offer);
    // io.emit('station.update', station, offer);
  });

  socket.on('disconnect', () => {
    console.log('station.disconnect', socket.conn.id);
    station.listeners = station.listeners.filter(e => e !== socket.conn.id);
    io.emit('radio.update', radio);
  });

  station.listeners.push(socket.conn.id);
  io.emit('station.update', station);
}

function radioConnection(socket) {
  console.log('radio.connect', socket.id);

  socket.on('radio.add', (station) => {
    const room = io.sockets.adapter.rooms;
    console.log('radio.add', station);
    if (!station.listeners) {
      station.listeners = [];
    }
    radio.stations.push(station);
    // if (!room) {
    //   // const newStation = io.of('/' + station.id);
    //   // newStation.on('connection', stationConnection);
    //   socket.join(station.id);
    // } else {
    //   io.to(room).emit('join', socket.id);
    // }
    io.emit('radio.update', radio);
  });

  socket.on('radio.remove', (stationId) => {
    console.log('radio.remove', stationId);
    radio.stations = radio.stations.filter(e => e !== stationId);
    io.emit('radio.update', radio);
  });

  socket.on('disconnect', () => {
    console.log('radio.disconnect', socket.id);
    radio.listeners = radio.listeners.filter(e => e !== socket.id);
    io.emit('radio.update', radio);
  });

  // update radio details for all listeners
  radio.listeners.push(socket.id);
  io.emit('radio.update', radio);
}

// setup http server
const app = createServer(protocol, handleRequest);
app.listen(port, hostname);
console.log(`server: ${protocol}://${hostname}:${port}`);

// setup websockets
let io = require('socket.io')(app);
io.on('connection', radioConnection);

// Helper functions
function getStation(stationId) {
  return radio.stations.filter(function(station) {
    return station.id === stationId;
  })[0];
}
