import {
  getLegacySocketUrl,
  isLegacySocketEnabled,
} from './socketConfig';

let socket = null;

const getSocket = () => {
  if (!isLegacySocketEnabled()) {
    return null;
  }

  if (!socket) {
    const socketIoClient = require('socket.io-client');
    const io = socketIoClient.default || socketIoClient;

    socket = io(getLegacySocketUrl(), {
      transports: ['websocket'],
      jsonp: false,
    });
  }

  return socket;
};

const sendMessage = (message) => {
  getSocket()?.emit('nuevoMensaje', message);
};

export { getSocket, isLegacySocketEnabled, sendMessage };
