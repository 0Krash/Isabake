const {
  EMAIL_PROVIDER_CONSOLE,
  EMAIL_PROVIDER_HTTP,
  EMAIL_PROVIDER_NOOP,
  InvitationEmailService,
  createInvitationEmailPayload,
  getInvitationEmailProvider,
  shouldLogDevInviteLinks,
  shouldRequireEmailConfig,
} = require('../../services/invitationEmailService');

describe('InvitationEmailService', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.INVITATION_EMAIL_FROM;
    delete process.env.INVITATION_EMAIL_PROVIDER;
    delete process.env.INVITATION_EMAIL_REPLY_TO;
    delete process.env.INVITATION_EMAIL_REQUIRE_CONFIG;
    delete process.env.INVITATION_EMAIL_WEBHOOK_API_KEY;
    delete process.env.INVITATION_EMAIL_WEBHOOK_URL;
    delete process.env.LOG_DEV_INVITE_LINKS;
    process.env.NODE_ENV = 'test';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const createEmail = (overrides = {}) => ({
    inviteLink: 'isabake://invite/raw_token',
    role: 'member',
    to: 'invitee@example.test',
    workspaceName: 'Isabake Test',
    ...overrides,
  });

  test('defaults to noop and returns an explicit skipped result', async () => {
    const service = new InvitationEmailService();

    await expect(
      service.sendWorkspaceInvitationEmail(createEmail()),
    ).resolves.toEqual({
      provider: EMAIL_PROVIDER_NOOP,
      sent: false,
      status: 'skipped',
    });
    expect(getInvitationEmailProvider()).toBe(EMAIL_PROVIDER_NOOP);
  });

  test('production noop returns not_configured instead of pretending to send', async () => {
    process.env.NODE_ENV = 'production';
    const service = new InvitationEmailService();

    await expect(
      service.sendWorkspaceInvitationEmail(createEmail()),
    ).resolves.toEqual({
      error: 'email_provider_not_configured',
      provider: EMAIL_PROVIDER_NOOP,
      sent: false,
      status: 'not_configured',
    });
    expect(shouldRequireEmailConfig()).toBe(true);
  });

  test('console provider logs raw links only when explicitly enabled outside production', async () => {
    process.env.INVITATION_EMAIL_PROVIDER = EMAIL_PROVIDER_CONSOLE;
    process.env.LOG_DEV_INVITE_LINKS = 'true';
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const service = new InvitationEmailService();

    await expect(
      service.sendWorkspaceInvitationEmail(createEmail()),
    ).resolves.toEqual({
      provider: EMAIL_PROVIDER_CONSOLE,
      sent: true,
      status: 'sent',
    });

    expect(shouldLogDevInviteLinks()).toBe(true);
    expect(consoleSpy).toHaveBeenCalledWith(
      '[dev-invite-link]',
      expect.objectContaining({ inviteLink: 'isabake://invite/raw_token' }),
    );
    consoleSpy.mockRestore();
  });

  test('console provider is disabled in production and does not log raw links', async () => {
    process.env.INVITATION_EMAIL_PROVIDER = EMAIL_PROVIDER_CONSOLE;
    process.env.LOG_DEV_INVITE_LINKS = 'true';
    process.env.NODE_ENV = 'production';
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    const service = new InvitationEmailService();

    await expect(
      service.sendWorkspaceInvitationEmail(createEmail()),
    ).resolves.toEqual({
      error: 'console_email_provider_disabled_in_production',
      provider: EMAIL_PROVIDER_CONSOLE,
      sent: false,
      status: 'not_configured',
    });
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  test('http provider returns not_configured when webhook is missing', async () => {
    process.env.INVITATION_EMAIL_PROVIDER = EMAIL_PROVIDER_HTTP;
    const fetchImpl = jest.fn();
    const service = new InvitationEmailService({ fetchImpl });

    await expect(
      service.sendWorkspaceInvitationEmail(createEmail()),
    ).resolves.toEqual({
      error: 'email_webhook_not_configured',
      provider: EMAIL_PROVIDER_HTTP,
      sent: false,
      status: 'not_configured',
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test('http provider sends invitation payload to configured webhook', async () => {
    process.env.INVITATION_EMAIL_FROM = 'hello@isabake.test';
    process.env.INVITATION_EMAIL_PROVIDER = EMAIL_PROVIDER_HTTP;
    process.env.INVITATION_EMAIL_REPLY_TO = 'support@isabake.test';
    process.env.INVITATION_EMAIL_WEBHOOK_API_KEY = 'email_api_key';
    process.env.INVITATION_EMAIL_WEBHOOK_URL = 'https://email.test/send';
    const fetchImpl = jest.fn(async () => ({ status: 202 }));
    const service = new InvitationEmailService({ fetchImpl });

    await expect(
      service.sendWorkspaceInvitationEmail(
        createEmail({
          expiresAt: '2030-01-01T00:00:00.000Z',
          inviterEmail: 'owner@example.test',
          inviterName: 'Owner',
          role: 'viewer',
        }),
      ),
    ).resolves.toEqual({
      provider: EMAIL_PROVIDER_HTTP,
      sent: true,
      status: 'sent',
    });

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://email.test/send',
      expect.objectContaining({
        body: expect.stringContaining('isabake://invite/raw_token'),
        headers: {
          authorization: 'Bearer email_api_key',
          'content-type': 'application/json',
        },
        method: 'POST',
      }),
    );
  });

  test('http provider returns failed safely on provider errors', async () => {
    process.env.INVITATION_EMAIL_PROVIDER = EMAIL_PROVIDER_HTTP;
    process.env.INVITATION_EMAIL_WEBHOOK_URL = 'https://email.test/send';
    const service = new InvitationEmailService({
      fetchImpl: jest.fn(async () => ({ status: 500 })),
    });

    await expect(
      service.sendWorkspaceInvitationEmail(createEmail()),
    ).resolves.toEqual({
      error: 'email_delivery_failed',
      provider: EMAIL_PROVIDER_HTTP,
      sent: false,
      status: 'failed',
    });
  });

  test('email payload keeps delivery details explicit', () => {
    expect(
      createInvitationEmailPayload(
        createEmail({
          expiresAt: '2030-01-01T00:00:00.000Z',
          from: 'hello@isabake.test',
          inviterName: 'Owner',
          replyTo: 'support@isabake.test',
        }),
      ),
    ).toEqual(
      expect.objectContaining({
        from: 'hello@isabake.test',
        inviteLink: 'isabake://invite/raw_token',
        replyTo: 'support@isabake.test',
        subject: 'Invitacion a Isabake Test',
        to: 'invitee@example.test',
      }),
    );
  });
});
