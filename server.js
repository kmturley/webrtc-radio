const fs = require('fs');
const os = require('os');

const hostname = '0.0.0.0';
const keys = './keys';
const max = 50;
const port = 8080;
const protocol = 'https';
const root = '/src';

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
  socket.on('join', (stationId) => {
    let clients = io.sockets.adapter.rooms[stationId];
    let total = clients ? Object.keys(clients.sockets).length : 0;
    total += 1;
    console.log(`station ${stationId} has ${total} clients`);
    if (total === 1) {
      socket.join(stationId);
      console.log(`station ${stationId} created by client ${socket.id}`);
      socket.emit('created', stationId, socket.id);
    } else if (total < max) {
      socket.join(stationId);
      console.log(`station ${stationId} joined by ${socket.id} `);
      socket.emit('joined', stationId, socket.id);
      io.to(stationId).emit('join', socket.id);
    } else {
      console.log(`station ${stationId} is full at (${max}) clients`);
      socket.emit('full', stationId);
    }
  });

  socket.on('offer', (offer, recipientId) => {
    io.to(recipientId).emit('offer', offer, socket.id);
  });

  socket.on('answer', (answer, recipientId) => {
    io.to(recipientId).emit('answer', answer, socket.id);
  });

  socket.on('candidate', (candidate, recipientId) => {
    io.to(recipientId).emit('candidate', candidate, socket.id);
  });

  socket.on('leave', (stationId) => {
    console.log(`station ${stationId} left by ${socket.id}`);
    io.to(stationId).emit('leave', stationId, socket.id);
    socket.leave(stationId);
  });
}

// setup http server
const app = createServer(protocol, handleRequest);
app.listen(port, hostname);
console.log(`server: ${protocol}://${hostname}:${port}`);

// setup websockets
let io = require('socket.io')(app);
io.on('connection', handleSockets);
