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

function handleSockets(socket) {
  console.log('handleSockets', socket.id);

  socket.on('stations.add', (station) => {
    console.log('socket.stations.add', station);
    stations.push(station);
    // const nsp = io.of('/' + station.id);
    // nsp.on('connection', () => {
    //   console.log('someone connected to', station.id);
    // });
    io.emit('stations', stations);
  });

  socket.on('stations.remove', (stationId) => {
    console.log('socket.stations.remove', stationId);
    stations = stations.filter(function(station) {
      return station.id !== stationId;
    });
    io.emit('stations', stations);
  });

  socket.on('join', (station) => {
    console.log('socket.join', station);
    // listeners.push(listener);
    // io.emit('join', io.sockets.adapter.rooms);
  });



  socket.emit('stations', stations);
}

// setup http server
const app = createServer(protocol, handleRequest);
app.listen(port, hostname);
console.log(`server: ${protocol}://${hostname}:${port}`);

// setup websockets
let io = require('socket.io')(app);
io.on('connection', handleSockets);
