const { randomBytes, scrypt, timingSafeEqual } = require('crypto');
const { promisify } = require('util');

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

const hashPassword = async (password) => {
  if (!password || String(password).length < 8) {
    const error = new Error('password_min_length_8');
    error.statusCode = 400;
    throw error;
  }

  const salt = randomBytes(16).toString('hex');
  const derivedKey = await scryptAsync(String(password), salt, KEY_LENGTH);

  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
};

const verifyPassword = async (password, passwordHash) => {
  const [algorithm, salt, storedHash] = String(passwordHash || '').split(':');

  if (algorithm !== 'scrypt' || !salt || !storedHash) {
    return false;
  }

  const derivedKey = await scryptAsync(String(password || ''), salt, KEY_LENGTH);
  const storedBuffer = Buffer.from(storedHash, 'hex');

  return (
    storedBuffer.length === derivedKey.length &&
    timingSafeEqual(storedBuffer, derivedKey)
  );
};

module.exports = {
  hashPassword,
  verifyPassword,
};
