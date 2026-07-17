const EMAIL_PROVIDER_CONSOLE = 'console';
const EMAIL_PROVIDER_HTTP = 'http';
const EMAIL_PROVIDER_NOOP = 'noop';

const isProduction = () => process.env.NODE_ENV === 'production';

const normalizeBoolean = (value) =>
  String(value || '').trim().toLowerCase() === 'true';

const getInvitationEmailProvider = () =>
  String(process.env.INVITATION_EMAIL_PROVIDER || EMAIL_PROVIDER_NOOP)
    .trim()
    .toLowerCase();

const shouldLogDevInviteLinks = () =>
  !isProduction() && normalizeBoolean(process.env.LOG_DEV_INVITE_LINKS);

const shouldRequireEmailConfig = () =>
  isProduction() || normalizeBoolean(process.env.INVITATION_EMAIL_REQUIRE_CONFIG);

const createEmailDeliveryResult = ({
  error,
  provider,
  sent = false,
  status,
}) => ({
  ...(error ? { error } : {}),
  provider,
  sent,
  status,
});

const createInvitationEmailPayload = ({
  expiresAt,
  from,
  inviteLink,
  inviterEmail,
  inviterName,
  replyTo,
  role,
  to,
  workspaceName,
}) => ({
  from: from || null,
  inviteLink,
  inviterEmail: inviterEmail || null,
  inviterName: inviterName || null,
  replyTo: replyTo || null,
  role,
  subject: `Invitacion a ${workspaceName || 'Isabake'}`,
  text: [
    inviterName
      ? `${inviterName} te invito a colaborar en ${workspaceName}.`
      : `Te invitaron a colaborar en ${workspaceName}.`,
    `Rol: ${role}.`,
    expiresAt ? `Expira: ${expiresAt}.` : null,
    `Abrir invitacion: ${inviteLink}`,
  ]
    .filter(Boolean)
    .join('\n'),
  to,
  workspaceName,
});

class InvitationEmailService {
  constructor(options = {}) {
    this.fetchImpl = options.fetchImpl || global.fetch;
  }

  async sendWorkspaceInvitationEmail({
    expiresAt,
    inviteLink,
    inviterEmail,
    inviterName,
    role,
    to,
    workspaceName,
  }) {
    const provider = getInvitationEmailProvider();

    if (!to || !inviteLink) {
      return createEmailDeliveryResult({
        error: 'invitation_email_missing_fields',
        provider,
        status: 'failed',
      });
    }

    if (provider === EMAIL_PROVIDER_NOOP) {
      return createEmailDeliveryResult({
        error: shouldRequireEmailConfig() ? 'email_provider_not_configured' : undefined,
        provider,
        status: shouldRequireEmailConfig() ? 'not_configured' : 'skipped',
      });
    }

    if (provider === EMAIL_PROVIDER_CONSOLE) {
      if (isProduction()) {
        return createEmailDeliveryResult({
          error: 'console_email_provider_disabled_in_production',
          provider,
          status: 'not_configured',
        });
      }

      if (shouldLogDevInviteLinks()) {
        console.log('[dev-invite-link]', {
          inviteLink,
          role,
          to,
          workspaceName,
          inviterEmail: inviterEmail || null,
          inviterName: inviterName || null,
        });
      }

      return createEmailDeliveryResult({
        provider,
        sent: shouldLogDevInviteLinks(),
        status: shouldLogDevInviteLinks() ? 'sent' : 'skipped',
      });
    }

    if (provider === EMAIL_PROVIDER_HTTP) {
      return this.sendViaHttpProvider({
        expiresAt,
        inviteLink,
        inviterEmail,
        inviterName,
        role,
        to,
        workspaceName,
      });
    }

    return createEmailDeliveryResult({
      error: 'email_provider_not_supported',
      provider,
      status: 'not_configured',
    });
  }

  async sendViaHttpProvider({
    expiresAt,
    inviteLink,
    inviterEmail,
    inviterName,
    role,
    to,
    workspaceName,
  }) {
    const webhookUrl = String(
      process.env.INVITATION_EMAIL_WEBHOOK_URL || '',
    ).trim();

    if (!webhookUrl || typeof this.fetchImpl !== 'function') {
      return createEmailDeliveryResult({
        error: 'email_webhook_not_configured',
        provider: EMAIL_PROVIDER_HTTP,
        status: 'not_configured',
      });
    }

    const payload = createInvitationEmailPayload({
      expiresAt,
      from: process.env.INVITATION_EMAIL_FROM,
      inviteLink,
      inviterEmail,
      inviterName,
      replyTo: process.env.INVITATION_EMAIL_REPLY_TO,
      role,
      to,
      workspaceName,
    });
    const headers = {
      'content-type': 'application/json',
    };
    const apiKey = String(
      process.env.INVITATION_EMAIL_WEBHOOK_API_KEY || '',
    ).trim();

    if (apiKey) {
      headers.authorization = `Bearer ${apiKey}`;
    }

    try {
      const response = await this.fetchImpl(webhookUrl, {
        body: JSON.stringify(payload),
        headers,
        method: 'POST',
      });

      if (!response || response.status < 200 || response.status >= 300) {
        return createEmailDeliveryResult({
          error: 'email_delivery_failed',
          provider: EMAIL_PROVIDER_HTTP,
          status: 'failed',
        });
      }

      return createEmailDeliveryResult({
        provider: EMAIL_PROVIDER_HTTP,
        sent: true,
        status: 'sent',
      });
    } catch (error) {
      return createEmailDeliveryResult({
        error: 'email_delivery_failed',
        provider: EMAIL_PROVIDER_HTTP,
        status: 'failed',
      });
    }
  }
}

module.exports = {
  EMAIL_PROVIDER_CONSOLE,
  EMAIL_PROVIDER_HTTP,
  EMAIL_PROVIDER_NOOP,
  InvitationEmailService,
  createInvitationEmailPayload,
  getInvitationEmailProvider,
  shouldLogDevInviteLinks,
  shouldRequireEmailConfig,
};
