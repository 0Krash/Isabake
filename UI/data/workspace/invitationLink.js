export const getInvitationTokenFromUrl = (url = '') => {
  const value = String(url || '').trim();

  if (!value) {
    return null;
  }

  const directMatch = value.match(/^isabake:\/\/invite\/([^/?#]+)/i);

  if (directMatch) {
    return decodeURIComponent(directMatch[1]);
  }

  try {
    const parsedUrl = new URL(value);
    const segments = parsedUrl.pathname.split('/').filter(Boolean);
    const inviteIndex = segments.findIndex(
      (segment) => segment.toLowerCase() === 'invite',
    );

    if (inviteIndex >= 0 && segments[inviteIndex + 1]) {
      return decodeURIComponent(segments[inviteIndex + 1]);
    }
  } catch (error) {
    return null;
  }

  return null;
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
