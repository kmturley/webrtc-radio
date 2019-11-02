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
  socket.on('join', (room) => {
    let clients = io.sockets.adapter.rooms[room];
    let total = clients ? Object.keys(clients.sockets).length : 0;
    total += 1;
    console.log(`websockets: room ${room} has ${total} clients`);
    if (total === 1) {
      socket.join(room);
      console.log(`websockets: room ${room} created by client ${socket.id}`);
      socket.emit('created', room, socket.id);
    } else if (total < max) {
      socket.join(room);
      console.log(`websockets: room ${room} joined by ${socket.id} `);
      socket.emit('joined', room, socket.id);
      io.to(room).emit('join', socket.id);
    } else {
      console.log(`websockets: room ${room} is full at (${max}) clients`);
      socket.emit('full', room);
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

  socket.on('leave', (room, socketId) => {
    console.log(`websockets: room ${room} left by ${socket.id}`);
    io.to(room).emit('leave', room, socketId);
    socket.leave(room);
  });
}

// setup http server
const app = createServer(protocol, handleRequest);
app.listen(port, hostname);
console.log(`server: ${protocol}://${hostname}:${port}`);

// setup websockets
let io = require('socket.io')(app);
io.on('connection', handleSockets);
