export const getInvitationTokenFromUrl = (url = '') => {
  const value = String(url || '').trim();

  if (!value) {
    return null;
  }

  const directMatch = value.match(/^isabake:\/\/invite\/([^/?#]+)/i);

  if (directMatch) {
    return decodeInvitationToken(directMatch[1]);
  }

  try {
    const parsedUrl = new URL(value);
    const protocol = parsedUrl.protocol.toLowerCase();
    const segments = getInvitationPathSegments(parsedUrl);
    const inviteIndex = segments.findIndex(
      (segment) => segment.toLowerCase() === 'invite',
    );

    if (!['https:', 'http:', 'isabake:'].includes(protocol)) {
      return null;
    }

    if (inviteIndex === 0 && segments[inviteIndex + 1]) {
      return decodeInvitationToken(segments[inviteIndex + 1]);
    }
  } catch (error) {
    return null;
  }

  return null;
};

const decodeInvitationToken = (token = '') => {
  try {
    const decodedToken = decodeURIComponent(String(token || '')).trim();

    return decodedToken || null;
  } catch (error) {
    return null;
  }
};

const getInvitationPathSegments = (parsedUrl) => {
  if (parsedUrl.protocol.toLowerCase() === 'isabake:') {
    const hostSegments = parsedUrl.hostname ? [parsedUrl.hostname] : [];
    const pathSegments = parsedUrl.pathname.split('/').filter(Boolean);

    return [...hostSegments, ...pathSegments];
  }

  return parsedUrl.pathname.split('/').filter(Boolean);
};

export const parseInvitationLink = (url = '') => {
  const token = getInvitationTokenFromUrl(url);

  if (!token) {
    return {
      error: 'invalid_invitation_link',
      ok: false,
      token: null,
    };
  }

  return {
    error: null,
    ok: true,
    token,
  };
};

export default {
  getInvitationTokenFromUrl,
  parseInvitationLink,
};
