const fs = require('fs');
const os = require('os');

const hostname = '0.0.0.0';
const keys = './keys';
const port = 8080;
const protocol = 'https';
const root = '/dist';
const mimeTypes = {
  'html': 'text/html',
  'jpeg': 'image/jpeg',
  'jpg': 'image/jpeg',
  'png': 'image/png',
  'js': 'text/javascript',
  'css': 'text/css'
};

const listeners = {};
const stations = {};

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
    req.url = '/index.html';
  }
  console.log(`server: ${__dirname + root + req.url}`);
  fs.readFile(__dirname + root + req.url, function (err, data) {
    if (err) {
      res.writeHead(404);
      res.end(JSON.stringify(err));
      return;
    }
    const mimeType = mimeTypes[req.url.split('.').pop()];
    res.writeHead(200, {'Content-Type': mimeType || 'text/plain'});
    res.end(data);
  });
}

function exists(stationId) {
  return stations[stationId];
}

function isOwner(stationId, socket) {
  return stations[stationId] && stations[stationId].owner.id === socket.id;
}

function handleSockets(socket) {
  // connect to radio
  console.log('connect', socket.id);
  listeners[socket.id] = {
    id: socket.id,
    name: null,
    owns: null,
  };
  socket.emit('connected', socket.id);
  socket.emit('stations.updated', stations);
  io.emit('listeners.updated', listeners);

  // disconnect from radio
  socket.on('disconnect', () => {
    console.log('disconnect', socket.id);
    const myStationId = listeners[socket.id].owns;
    if (typeof myStationId === 'string') {
      delete stations[myStationId];
      io.emit('stations.updated', stations);
    }
    if (listeners[socket.id]) {
      delete listeners[socket.id];
      io.emit('listeners.updated', listeners);
    }
    socket.emit('disconnected', socket.id);
  });

  // add a station
  socket.on('add', (stationId, stationName) => {
    if (!exists(stationId)) {
      console.log('add', stationId);
      listeners[socket.id].owns = stationId;
      stations[stationId] = {
        broadcasting: false,
        id: stationId,
        listeners: {},
        name: stationName,
        owner: listeners[socket.id],
      };
      socket.emit('added', stationId);
      io.emit('stations.updated', stations);
    }
  });

  // remove a station
  socket.on('remove', (stationId) => {
    if (exists(stationId) && isOwner(stationId, socket)) {
      console.log('remove', stationId);
      listeners[socket.id].owns = null;
      delete stations[stationId];
      socket.emit('removed', stationId);
      io.emit('stations.updated', stations);
    }
  });

  // update a station
  socket.on('update', (stationId, stationName) => {
    if (exists(stationId) && isOwner(stationId, socket)) {
      console.log('update', stationId);
      stations[stationId].name = stationName;
      socket.emit('updated', stationId);
      io.emit('stations.updated', stations);
    }
  });

  // join a station
  socket.on('join', (stationId) => {
    if (exists(stationId)) {
      console.log('join', stationId);
      stations[stationId].listeners[socket.id] = listeners[socket.id];
      socket.join(stationId);
      socket.emit('joined', stationId);
      io.to(stationId).emit('listener.joined', socket.id);
      io.emit('stations.updated', stations);
    }
  });

  // leave a station
  socket.on('leave', (stationId) => {
    if (exists(stationId)) {
      console.log('leave', stationId);
      delete stations[stationId].listeners[socket.id];
      socket.leave(stationId);
      socket.emit('left', stationId);
      io.emit('listener.left', socket.id);
      io.emit('stations.updated', stations);
    }
  });

  // start a broadcast
  socket.on('start', (stationId) => {
    if (exists(stationId) && isOwner(stationId, socket)) {
      stations[stationId].broadcasting = true;
      socket.emit('started', stationId);
      io.emit('stations.updated', stations);
    }
  });

  // stop a broadcast
  socket.on('stop', (stationId) => {
    if (exists(stationId) && isOwner(stationId, socket)) {
      stations[stationId].broadcasting = false;
      socket.emit('stopped', stationId);
      io.emit('stations.updated', stations);
    }
  });

  // update listener name
  socket.on('updateName', (listenerName) => {
    listeners[socket.id].name = listenerName;
    io.emit('listeners.updated', listeners);
  });

  // negotiate audio
  socket.on('offer', (offer, recipientId) => {
    io.to(recipientId).emit('offer', offer, socket.id);
  });

  socket.on('answer', (answer, recipientId) => {
    io.to(recipientId).emit('answer', answer, socket.id);
  });

  socket.on('candidate', (candidate, recipientId) => {
    io.to(recipientId).emit('candidate', candidate, socket.id);
  });
}

// setup http server
const app = createServer(protocol, handleRequest);
app.listen(port, hostname);
console.log(`server: ${protocol}://${hostname}:${port}`);

// setup websockets
let io = require('socket.io')(app);
io.on('connection', handleSockets);
