module.exports = (io, socket) => {
  // Escuchar evento de nuevo mensaje
  socket.on('nuevoMensaje', (msg) => {
    console.log('Mensaje recibido:', msg);
    // Emitir el mensaje a todos los clientes
    io.emit('mensaje', msg);
  });

  // Desconexión del cliente
  socket.on('disconnect', () => {
    console.log('Cliente desconectado');
  });
};
