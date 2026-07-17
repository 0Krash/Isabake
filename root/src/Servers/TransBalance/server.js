const http = require('http');
const mongoose = require('mongoose');

const app = require('./app');
const { isLegacySocketIoEnabled } = require('./services/legacySocketConfig');

//DB Connection
const DB = process.env.DATABASE;
console.log(`Trying to connect to: ${DB}`);
mongoose
  .connect(DB)
  .then(() => {
    console.log('Database Connection Successfully');
  })
  .catch((error) => {
    console.log('Database Connection Error', error);
  });

//Create Server
const server = http.createServer(app);

if (isLegacySocketIoEnabled()) {
  const socketio = require('socket.io');
  const socketHandlers = require('./socket/handlers');
  const io = socketio(server);

  io.on('connection', (socket) => {
    console.log(`New client connected as: ${socket.id}`);
    socketHandlers(io, socket);
  });
}

const port = process.env.PORT;
server.listen(port, () => {
  console.log(`App running on port ${port}...`);
});
