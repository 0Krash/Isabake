export {
  dedupeWorkspaces,
  getWorkspaceListKey,
  normalizeWorkspaceId,
} from '../../data/workspace/workspaceListModel';

export const getWorkspaceModeLabel = (workspace) =>
  workspace?.isRemote ? 'Compartido' : 'Solo local';

export const sanitizeMemberForDisplay = (member = {}) => ({
  role: member.role || 'member',
  status: member.status || 'active',
  userId: member.userId || member.email || 'sin_usuario',
});

export const isValidInvitationEmail = (email = '') =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());

export const sanitizeInvitationForDisplay = (
  invitation = {},
  { exposeDevInviteLink = false } = {},
) => {
  const emailDelivery = invitation.emailDelivery
    ? {
        provider: invitation.emailDelivery.provider || 'unknown',
        sent: Boolean(invitation.emailDelivery.sent),
        status: invitation.emailDelivery.status || 'unknown',
      }
    : null;

  return {
    ...(exposeDevInviteLink && invitation.devInviteLink
      ? { devInviteLink: invitation.devInviteLink }
      : {}),
    ...(emailDelivery ? { emailDelivery } : {}),
    email: invitation.email || 'sin_correo',
    groupId: invitation.groupId || null,
    invitationId: invitation.invitationId || null,
    inviteLinkCreatedAt: invitation.inviteLinkCreatedAt || null,
    inviteTokenExpiresAt: invitation.inviteTokenExpiresAt || null,
    role: invitation.role || 'member',
    status: invitation.status || 'invited',
  };
};
