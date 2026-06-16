const http = require('http');
const mongoose = require('mongoose');
const socketio = require('socket.io');

const app = require('./app');
const socketHandlers = require('./socket/handlers');

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
const io = socketio(server);

//Events
io.on('connection', (socket) => {
  console.log(`New client connected as: ${socket.id}`);
  socketHandlers(io, socket);
});

const port = process.env.PORT;
server.listen(port, () => {
  console.log(`App running on port ${port}...`);
});
