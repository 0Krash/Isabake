const { createHmac, randomUUID } = require('crypto');

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

const base64UrlEncode = (value) =>
  Buffer.from(JSON.stringify(value)).toString('base64url');

const base64UrlDecode = (value) =>
  JSON.parse(Buffer.from(value, 'base64url').toString('utf8'));

const getJwtSecret = () =>
  process.env.JWT_SECRET ||
  (process.env.NODE_ENV === 'production'
    ? null
    : 'transbalance-local-test-secret');

const signPart = (value, secret) =>
  createHmac('sha256', secret).update(value).digest('base64url');

const signJwt = (payload, { expiresInSeconds = ACCESS_TOKEN_TTL_SECONDS } = {}) => {
  const secret = getJwtSecret();

  if (!secret) {
    const error = new Error('jwt_secret_required');
    error.statusCode = 500;
    throw error;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode({ alg: 'HS256', typ: 'JWT' });
  const body = base64UrlEncode({
    ...payload,
    exp: now + expiresInSeconds,
    iat: now,
    jti: payload.jti || randomUUID(),
  });
  const signature = signPart(`${header}.${body}`, secret);

  return `${header}.${body}.${signature}`;
};

const verifyJwt = (token) => {
  const secret = getJwtSecret();

  if (!secret) {
    const error = new Error('jwt_secret_required');
    error.statusCode = 500;
    throw error;
  }

  const [header, body, signature] = String(token || '').split('.');

  if (!header || !body || !signature) {
    const error = new Error('invalid_token');
    error.statusCode = 401;
    throw error;
  }

  const expectedSignature = signPart(`${header}.${body}`, secret);

  if (signature !== expectedSignature) {
    const error = new Error('invalid_token');
    error.statusCode = 401;
    throw error;
  }

  const payload = base64UrlDecode(body);
  const now = Math.floor(Date.now() / 1000);

  if (payload.exp && payload.exp < now) {
    const error = new Error('token_expired');
    error.statusCode = 401;
    throw error;
  }

  return payload;
};

const issueTokenPair = (user) => ({
  accessToken: signJwt(
    {
      email: user.email,
      sub: user.userId,
      tokenUse: 'access',
    },
    { expiresInSeconds: ACCESS_TOKEN_TTL_SECONDS },
  ),
  expiresIn: ACCESS_TOKEN_TTL_SECONDS,
  refreshToken: signJwt(
    {
      sub: user.userId,
      tokenUse: 'refresh',
    },
    { expiresInSeconds: REFRESH_TOKEN_TTL_SECONDS },
  ),
});

module.exports = {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  issueTokenPair,
  signJwt,
  verifyJwt,
};
