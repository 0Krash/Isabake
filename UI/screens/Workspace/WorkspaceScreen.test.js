import {
  dedupeWorkspaces,
  getWorkspaceListKey,
  getWorkspaceModeLabel,
  isValidInvitationEmail,
  sanitizeInvitationForDisplay,
  sanitizeMemberForDisplay,
} from './workspaceUiModel';

describe('WorkspaceScreen model helpers', () => {
  test('labels local-only and shared workspace modes', () => {
    expect(getWorkspaceModeLabel({ isRemote: false })).toBe('Solo local');
    expect(getWorkspaceModeLabel({ isRemote: true })).toBe('Compartido');
    expect(getWorkspaceModeLabel(null)).toBe('Solo local');
  });

  test('sanitizes member display without exposing tokens', () => {
    expect(
      sanitizeMemberForDisplay({
        accessToken: 'secret',
        refreshToken: 'secret',
        role: 'admin',
        status: 'active',
        userId: 'user_1',
      }),
    ).toEqual({
      role: 'admin',
      status: 'active',
      userId: 'user_1',
    });
  });

  test('workspace list model produces unique render keys after dedupe', () => {
    const workspaces = dedupeWorkspaces([
      { groupId: 'local_1', isRemote: false, name: 'Local' },
      { groupId: 'group_1', isRemote: true, name: 'Remote A' },
      { groupId: 'group_1', isRemote: true, name: 'Remote B' },
      { groupId: 'group_2', isRemote: true, name: 'Remote C' },
    ]);
    const keys = workspaces.map(getWorkspaceListKey);

    expect(keys).toEqual(['local:local_1', 'remote:group_1', 'remote:group_2']);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test('validates invitation email and sanitizes invitation display', () => {
    expect(isValidInvitationEmail('invitee@example.test')).toBe(true);
    expect(isValidInvitationEmail('not-an-email')).toBe(false);
    expect(
      sanitizeInvitationForDisplay({
        accessToken: 'secret',
        devInviteLink: 'isabake://invite/dev_token',
        emailDelivery: {
          error: 'internal_error_detail',
          provider: 'http',
          sent: false,
          status: 'failed',
        },
        email: 'invitee@example.test',
        inviteTokenHash: 'hash_secret',
        invitationId: 'invitation_1',
        refreshToken: 'secret',
        role: 'viewer',
        status: 'invited',
      }),
    ).toEqual({
      emailDelivery: {
        provider: 'http',
        sent: false,
        status: 'failed',
      },
      email: 'invitee@example.test',
      groupId: null,
      invitationId: 'invitation_1',
      inviteLinkCreatedAt: null,
      inviteTokenExpiresAt: null,
      role: 'viewer',
      status: 'invited',
    });
    expect(
      sanitizeInvitationForDisplay(
        {
          devInviteLink: 'isabake://invite/dev_token',
          email: 'invitee@example.test',
          invitationId: 'invitation_1',
        },
        { exposeDevInviteLink: true },
      ),
    ).toEqual(
      expect.objectContaining({
        devInviteLink: 'isabake://invite/dev_token',
        email: 'invitee@example.test',
      }),
    );
    expect(
      JSON.stringify(
        sanitizeInvitationForDisplay({
          devInviteLink: 'isabake://invite/dev_token',
          inviteTokenHash: 'hash_secret',
        }),
      ),
    ).not.toContain('dev_token');
  });
});
