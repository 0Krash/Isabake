const isProduction = () => process.env.NODE_ENV === 'production';

const shouldLogDevInviteLinks = () =>
  !isProduction() &&
  String(process.env.LOG_DEV_INVITE_LINKS || '').toLowerCase() === 'true';

class InvitationEmailService {
  async sendWorkspaceInvitationEmail({
    inviteLink,
    inviterName,
    role,
    to,
    workspaceName,
  }) {
    if (shouldLogDevInviteLinks()) {
      console.log('[dev-invite-link]', {
        inviteLink,
        role,
        to,
        workspaceName,
        inviterName: inviterName || null,
      });
    }

    return {
      provider: 'noop',
      sent: false,
    };
  }
}

module.exports = {
  InvitationEmailService,
  shouldLogDevInviteLinks,
};
