const fs = require('fs');
const os = require('os');

const hostname = '0.0.0.0';
const keys = './keys';
const port = 8080;
const protocol = 'https';
const root = '/src';

let radio = {
  listeners: {},
  stations: {}
};

// setup http server
const app = createServer(protocol, handleRequest);
app.listen(port, hostname);
console.log(`server: ${protocol}://${hostname}:${port}`);

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

// setup websockets
let io = require('socket.io')(app);
io.on('connection', radioConnection);

function radioConnection(socket) {
  console.log('radio.connect', socket.id);
  let currentStation = null;
  radio.listeners[socket.id] = true;
  io.emit('radio.update', radio);
  socket.emit('radio.connected', socket.id);

  socket.on('radio.add', (station) => {
    console.log('radio.add', station);
    if (!radio.stations[station.id]) {
      station.owner = socket.id;
      radio.stations[station.id] = station;
      io.emit('radio.update', radio);
      socket.emit('radio.added', station);
    }
  });

  socket.on('radio.remove', (stationId) => {
    console.log('radio.remove', stationId);
    const station = radio.stations[stationId];
    if (station.owner === socket.id) {
      delete radio.stations[stationId];
      io.emit('radio.update', radio);
      socket.emit('radio.removed', station);
    }
  });

  socket.on('radio.join', (stationId) => {
    console.log('radio.join', stationId);
    currentStation = radio.stations[stationId];
    if (currentStation && !currentStation.listeners[socket.id]) {
      socket.join(stationId);
      currentStation.listeners[socket.id] = true;
      io.emit('radio.update', radio);
      socket.emit('radio.joined', currentStation);
    }
  });

  socket.on('disconnect', () => {
    console.log('radio.disconnect', socket.id);
    delete radio.listeners[socket.id];
    if (currentStation && radio.stations[currentStation.id]) {
      delete radio.stations[currentStation.id].listeners[socket.id];
    }
    io.emit('radio.update', radio);
  });
}
