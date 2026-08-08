const listeners = new Set();
let seenInvitationKey = '';

export const getInvitationAttentionKey = (invitations = []) =>
  invitations
    .filter((invitation) => (invitation.status || 'invited') === 'invited')
    .map((invitation) => invitation.invitationId || invitation.email || '')
    .filter(Boolean)
    .sort()
    .join('|');

export const isInvitationAttentionSeen = (invitations = []) => {
  const key = getInvitationAttentionKey(invitations);

  return Boolean(key) && key === seenInvitationKey;
};

export const markInvitationAttentionSeen = (invitations = []) => {
  const key = getInvitationAttentionKey(invitations);

  if (!key || key === seenInvitationKey) {
    return;
  }

  seenInvitationKey = key;
  listeners.forEach((listener) => listener(seenInvitationKey));
};

export const subscribeToInvitationAttention = (listener) => {
  if (typeof listener !== 'function') {
    return () => {};
  }

  listeners.add(listener);
  return () => listeners.delete(listener);
};

