import {
  dedupeWorkspaces,
  formatEmailDeliveryStatus,
  formatInvitationStatus,
  formatMembershipStatus,
  formatWorkspaceError,
  formatWorkspaceName,
  formatWorkspaceRole,
  getInvitationActionState,
  getWorkspaceListKey,
  getWorkspaceEmptyState,
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
    expect(
      formatWorkspaceName({
        isRemote: true,
        name: 'ws_shared_phase_25_group',
      }),
    ).toBe('Negocio compartido');
    expect(formatWorkspaceName({ isRemote: false, name: 'local_1' })).toBe(
      'Solo en este dispositivo',
    );
    expect(formatWorkspaceName({ isRemote: true, name: 'Panaderia Norte' })).toBe(
      'Panaderia Norte',
    );
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
      role: 'Administrador',
      status: 'Activo',
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
      emailDeliveryLabel: 'Email: fallo (http)',
      email: 'invitee@example.test',
      invitationId: 'invitation_1',
      inviteLinkCreatedAt: null,
      inviteTokenExpiresAt: null,
      role: 'Solo lectura',
      status: 'Pendiente',
      statusKey: 'invited',
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

  test('formats workspace roles, statuses, email delivery, and safe errors', () => {
    expect(formatWorkspaceRole('owner')).toBe('Propietario');
    expect(formatWorkspaceRole('viewer')).toBe('Solo lectura');
    expect(formatMembershipStatus('removed')).toBe('Removido');
    expect(formatInvitationStatus('expired')).toBe('Expirada');
    expect(formatEmailDeliveryStatus({ provider: 'http', status: 'sent' })).toBe(
      'Email: enviado (http)',
    );
    expect(formatWorkspaceError('workspace_admin_required')).toBe(
      'Solo propietarios y administradores pueden realizar esta accion.',
    );
    expect(formatWorkspaceError('invitation_email_mismatch')).toBe(
      'Debes iniciar sesion con el correo invitado para aceptar esta invitacion.',
    );
  });

  test('returns workspace empty states and disabled invitation actions by role/status', () => {
    expect(getWorkspaceEmptyState({ type: 'members' })).toBe(
      'No hay miembros para mostrar.',
    );
    expect(getWorkspaceEmptyState({ authRequired: true })).toBe(
      'Inicia sesion para ver workspaces compartidos. El modo local sigue disponible.',
    );
    expect(
      getInvitationActionState({
        invitation: { status: 'invited' },
        role: 'admin',
      }),
    ).toEqual({
      canRegenerate: true,
      canRevoke: true,
      disabledReason: null,
    });
    expect(
      getInvitationActionState({
        invitation: { status: 'revoked' },
        role: 'admin',
      }),
    ).toEqual({
      canRegenerate: false,
      canRevoke: false,
      disabledReason: 'Esta invitacion ya no esta pendiente.',
    });
    expect(
      getInvitationActionState({
        invitation: { status: 'invited' },
        role: 'member',
      }).disabledReason,
    ).toBe('Solo propietarios y administradores pueden administrar invitaciones.');
  });
});
