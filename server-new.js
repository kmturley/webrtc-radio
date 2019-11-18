const fs = require('fs');
const os = require('os');

const hostname = '0.0.0.0';
const keys = './keys';
const port = 8080;
const protocol = 'https';
const root = '/src';

let stations = [];

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
  return stations.filter(function(station) {
    return station.id === stationId;
  })[0];
}

function stationConnection(socket) {
  const station = getStation(socket.nsp.name.slice(1));
  console.log('station.connect', socket.nsp.name, socket.conn.id);

  socket.on('station.start', (station) => {
    console.log('station.start', station);
  });

  socket.on('station.stop', (station) => {
    console.log('station.stop', station);
  });

  // send back station details
  // socket.emit('station.update', station);

  // update station details for all listeners
  station.listeners += 1;
  io.emit('radio.update', stations);
}

function radioConnection(socket) {
  console.log('radio.connect', socket.id);

  socket.on('radio.add', (station) => {
    console.log('radio.add', station);
    stations.push(station);
    const newStation = io.of('/' + station.id);
    newStation.on('connection', stationConnection);
    // send back new station info
    socket.emit('station.update', station);
    // update station details for all listeners
    io.emit('radio.update', stations);
  });

  socket.on('radio.remove', (stationId) => {
    console.log('radio.remove', stationId);
    stations = stations.filter(function(station) {
      return station.id !== stationId;
    });
    io.emit('radio.update', stations);
  });

  socket.emit('radio.update', stations);
}

// setup http server
const app = createServer(protocol, handleRequest);
app.listen(port, hostname);
console.log(`server: ${protocol}://${hostname}:${port}`);

// setup websockets
let io = require('socket.io')(app);
io.on('connection', radioConnection);
