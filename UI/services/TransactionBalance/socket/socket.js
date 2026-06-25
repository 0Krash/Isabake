import io from 'socket.io-client';
import { API_HOST } from '@env';

const socket = io(API_HOST, {
  transports: ['websocket'],
  jsonp: false,
});

const sendMessage = (message) => {
  socket.emit('nuevoMensaje', message);
};

export { socket, sendMessage };
