const isLegacySocketIoEnabled = () =>
  String(process.env.ENABLE_LEGACY_SOCKET_IO || '').toLowerCase() === 'true';

module.exports = {
  isLegacySocketIoEnabled,
};
