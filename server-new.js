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

function getStation(stationId) {
  return radio.stations[stationId];
}

function hasListener(socket, station) {
 return station.listeners[socket.id];
}

function isOwner(socket, station) {
  return socket.id === station.owner;
}

// setup websockets
let io = require('socket.io')(app);
io.on('connection', radioConnection);

function radioConnection(socket) {
  // connect to radio
  console.log('radio.connect', socket.id);
  let currentStation = null;
  radio.listeners[socket.id] = true;
  io.emit('radio.updated', radio);
  socket.emit('radio.connected', socket.id);

  // disconnect from radio
  socket.on('disconnect', () => {
    console.log('radio.disconnect', socket.id);
    delete radio.listeners[socket.id];
    if (currentStation && getStation(currentStation.id)) {
      delete radio.stations[currentStation.id].listeners[socket.id];
      if (isOwner(socket, currentStation)) {
        delete radio.stations[currentStation.id];
      }
    }
    io.emit('radio.updated', radio);
  });

  // add a station
  socket.on('radio.add', (station) => {
    console.log('radio.add', station);
    if (!radio.stations[station.id]) {
      station.owner = socket.id;
      radio.stations[station.id] = station;
      currentStation = radio.stations[station.id];
      io.emit('radio.updated', radio);
      socket.emit('radio.added', currentStation);
    }
  });

  // remove a station
  socket.on('radio.remove', (stationId) => {
    console.log('radio.remove', stationId);
    currentStation = getStation(stationId);
    if (isOwner(socket, currentStation)) {
      delete radio.stations[stationId];
      io.emit('radio.updated', radio);
      socket.emit('radio.removed', currentStation);
    }
  });

  // join a station
  socket.on('radio.join', (stationId) => {
    console.log('radio.join', stationId);
    currentStation = getStation(stationId);
    if (currentStation && !isOwner(socket, currentStation) && !hasListener(socket, currentStation)) {
      socket.join(stationId);
      currentStation.listeners[socket.id] = true;
      io.emit('radio.updated', radio);
      io.to(stationId).emit('radio.joined', currentStation);
    }
  });

  // leave a station
  socket.on('radio.leave', (stationId) => {
    console.log('radio.leave', stationId);
    currentStation = getStation(stationId);
    if (currentStation && hasListener(socket, currentStation)) {
      socket.leave(stationId);
      delete currentStation.listeners[socket.id];
      io.emit('radio.updated', radio);
      io.to(stationId).emit('radio.left', currentStation);
    }
  });

  // start a station broadcast
  socket.on('radio.start', (stationId, offer) => {
    console.log('radio.start', stationId, offer);
    currentStation = getStation(stationId);
    if (currentStation.owner === socket.id) {
      currentStation.offer = offer;
      io.emit('radio.updated', radio);
      io.to(stationId).emit('radio.started', currentStation);
    }
  });

  // stop a station broadcast
  socket.on('radio.stop', (stationId, offer) => {
    console.log('radio.stop', stationId, offer);
    currentStation = getStation(stationId);
    if (currentStation.owner === socket.id) {
      delete currentStation.offer;
      io.emit('radio.updated', radio);
      io.to(stationId).emit('radio.stopped', currentStation);
    }
  });
}
