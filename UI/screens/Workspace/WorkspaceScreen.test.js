import {
  dedupeWorkspaces,
  dedupeWorkspaceDisplayList,
  formatEmailDeliveryStatus,
  formatInvitationStatus,
  formatMembershipStatus,
  formatWorkspaceError,
  formatWorkspaceName,
  formatWorkspaceRole,
  getCurrentWorkspaceCardState,
  getDisplayInitials,
  getInvitationFormState,
  getLeaveWorkspaceBlockedReason,
  getMemberActionState,
  getMemberDisplayName,
  getInvitationActionState,
  getShareAccountRequiredModalState,
  getWorkspaceAccountAccessState,
  getWorkspaceRowState,
  getVisibleMembersForDisplay,
  getWorkspaceOwnershipLabel,
  getWorkspaceListKey,
  getWorkspaceEmptyState,
  getWorkspaceLeaveActionState,
  getWorkspaceModeLabel,
  getWorkspaceNameFormState,
  getWorkspaceTabState,
  getWorkspaceTypeLabel,
  isValidInvitationEmail,
  sanitizeInvitationForDisplay,
  sanitizeMemberForDisplay,
  shareAccountRequiredModalCopy,
  workspaceTabs,
} from './workspaceUiModel';
import fs from 'fs';
import path from 'path';

describe('WorkspaceScreen model helpers', () => {
  test('builds safe share-account-required modal copy and actions', () => {
    const onClose = jest.fn();
    const onOpenAccount = jest.fn();
    const sync = jest.fn();
    const state = getShareAccountRequiredModalState({
      onClose,
      onOpenAccount,
    });

    expect(state.copy.title).toBe(
      'Necesitas una cuenta\npara compartir este negocio',
    );
    expect(state.copy.description).toBe(
      'Inicia sesión para compartir este negocio con tu equipo y respaldar tu información en la nube.',
    );
    expect(state.copy.privacyNote).toBe(
      'Si no inicias sesión, este negocio seguirá siendo privado en este dispositivo.',
    );
    expect(state.copy.cancelLabel).toBe('Cancelar');
    expect(state.copy.loginLabel).toBe('Iniciar sesión');
    expect(JSON.stringify(shareAccountRequiredModalCopy)).not.toMatch(
      /token|hash|password|jwt/i,
    );

    state.actions.cancel();
    state.actions.openAccount();

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onOpenAccount).toHaveBeenCalledTimes(1);
    expect(sync).not.toHaveBeenCalled();
  });

  test('builds account access state without exposing session secrets', () => {
    expect(getWorkspaceAccountAccessState()).toEqual({
      actionLabel: 'Iniciar sesión',
      detail: 'Accede para crear y administrar negocios compartidos',
      iconName: 'account-user',
      label: 'Sin cuenta',
      signedIn: false,
      tone: 'neutral',
    });

    expect(getWorkspaceAccountAccessState({ loading: true })).toEqual({
      actionLabel: 'Abrir',
      detail: 'Verificando sesión',
      iconName: 'account-user',
      label: 'Cargando cuenta',
      signedIn: false,
      tone: 'neutral',
    });

    const signedInState = getWorkspaceAccountAccessState({
      session: {
        accessToken: 'raw-token',
        displayName: 'Ana Panadera',
        refreshTokenHash: 'hash-value',
      },
    });

    expect(signedInState).toEqual({
      actionLabel: 'Ver cuenta',
      detail: 'Ana Panadera',
      iconName: 'account-user',
      label: 'Cuenta activa',
      signedIn: true,
      tone: 'primary',
    });
    expect(JSON.stringify(signedInState)).not.toMatch(
      /raw-token|hash-value|token|hash|password|jwt/i,
    );
  });

  test('defines tab state without side effects', () => {
    expect(workspaceTabs.map((tab) => tab.label)).toEqual([
      'Negocios',
      'Equipo',
      'Invitaciones',
    ]);
    expect(getWorkspaceTabState('invitations')).toEqual([
      { active: false, key: 'workspaces', label: 'Negocios' },
      { active: false, key: 'team', label: 'Equipo' },
      { active: true, key: 'invitations', label: 'Invitaciones' },
    ]);
  });

  test('labels local-only and shared workspace modes', () => {
    expect(getWorkspaceModeLabel({ isRemote: false })).toBe(
      'Negocio personal',
    );
    expect(getWorkspaceModeLabel({ isRemote: true })).toBe('Compartido');
    expect(getWorkspaceModeLabel(null)).toBe('Negocio personal');
    expect(getWorkspaceOwnershipLabel({ isRemote: false })).toBe(
      'Solo tu puedes ver este negocio',
    );
    expect(
      getWorkspaceOwnershipLabel({ isRemote: true, workspaceRole: 'owner' }),
    ).toBe('Propietario');
    expect(
      formatWorkspaceName({
        isRemote: true,
        name: 'ws_shared_phase_25_group',
      }),
    ).toBe('Negocio compartido');
    expect(formatWorkspaceName({ isRemote: false, name: 'local_1' })).toBe(
      'Negocio personal',
    );
    expect(
      formatWorkspaceName({ isRemote: true, name: 'Panaderia Norte' }),
    ).toBe('Panaderia Norte');
  });

  test('sanitizes member display without exposing tokens', () => {
    expect(
      sanitizeMemberForDisplay({
        accessToken: 'secret',
        email: 'ana@example.test',
        refreshToken: 'secret',
        role: 'admin',
        status: 'active',
        isCurrentUser: true,
        userId: 'user_1',
      }),
    ).toEqual({
      createdAt: null,
      displayName: 'ana@example.test',
      email: 'ana@example.test',
      initials: 'A',
      isCurrentUser: true,
      role: 'Administrador',
      roleKey: 'admin',
      status: 'Activo',
      statusKey: 'active',
      statusTone: 'success',
      updatedAt: null,
      userId: 'user_1',
    });
    expect(
      JSON.stringify(
        sanitizeMemberForDisplay({
          accessToken: 'secret',
          passwordHash: 'hash_secret',
          refreshTokenHash: 'hash_secret',
          userId: 'user_raw',
        }),
      ),
    ).not.toContain('secret');
    expect(getMemberDisplayName({ userId: 'user_raw' })).toBe(
      'Usuario sin nombre',
    );
    expect(
      getMemberDisplayName({
        displayName: 'Ana',
        email: 'ana@example.test',
      }),
    ).toBe('Ana');
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
    expect(
      dedupeWorkspaceDisplayList(
        [
          { groupId: 'group_1', isRemote: true, name: 'Panaderia' },
          { groupId: 'group_1', isRemote: true, name: 'Panaderia' },
          { groupId: 'group_2', isRemote: true, name: 'Panaderia' },
        ],
        { groupId: 'group_2', isRemote: true, name: 'Panaderia' },
      ),
    ).toEqual([
      expect.objectContaining({ groupId: 'group_1' }),
      expect.objectContaining({ groupId: 'group_2' }),
    ]);
    expect(
      dedupeWorkspaceDisplayList(
        [
          { groupId: 'group_user_1', isRemote: true, name: 'S1' },
          { groupId: 'group_user_2', isRemote: true, name: 's1' },
        ],
        { groupId: 'group_user_1', isRemote: true, name: 'S1' },
      ).map((workspace) => workspace.groupId),
    ).toEqual(['group_user_1', 'group_user_2']);

    const sameNameRows = dedupeWorkspaceDisplayList(
      [
        {
          groupId: 'group_user_1',
          isRemote: true,
          name: 'S1',
          workspaceRole: 'owner',
        },
        {
          groupId: 'group_user_2',
          isRemote: true,
          name: 's1',
          workspaceRole: 'member',
        },
      ],
      { groupId: 'group_user_2', isRemote: true, name: 's1' },
    ).map((workspace) =>
      getWorkspaceRowState(workspace, {
        groupId: 'group_user_2',
        isRemote: true,
        name: 's1',
      }),
    );

    expect(sameNameRows).toEqual([
      expect.objectContaining({
        currentLabel: null,
        key: 'remote:group_user_1',
        typeLabel: 'Propietario',
      }),
      expect.objectContaining({
        currentLabel: 'En uso',
        key: 'remote:group_user_2',
        typeLabel: 'Miembro',
      }),
    ]);
    expect(
      dedupeWorkspaceDisplayList(
        [
          { groupId: 'group_1', isRemote: true, name: 'Panaderia Norte' },
          { groupId: 'local_1', isRemote: false, name: 'ZZ Negocio personal' },
          { groupId: 'group_2', isRemote: true, name: 'Panaderia Sur' },
        ],
        { groupId: 'group_2', isRemote: true, name: 'Panaderia Sur' },
      ).map((workspace) => workspace.groupId),
    ).toEqual(['local_1', 'group_1', 'group_2']);
    expect(
      dedupeWorkspaceDisplayList(
        [
          { groupId: 'group_1', isRemote: true, name: 'Panaderia Norte' },
          { groupId: 'group_2', isRemote: true, name: 'Panaderia Sur' },
          { groupId: 'group_3', isRemote: true, name: 'Panaderia Centro' },
        ],
        { groupId: 'group_3', isRemote: true, name: 'Panaderia Centro' },
      ).map((workspace) => workspace.groupId),
    ).toEqual(['group_3', 'group_1', 'group_2']);
  });

  test('builds safe current workspace and workspace row display state', () => {
    const currentWorkspace = {
      groupId: 'workspace_secret_group',
      isRemote: true,
      name: 'Panaderia Norte',
      workspaceRole: 'owner',
    };
    const otherWorkspace = {
      groupId: 'workspace_other_group',
      isRemote: true,
      name: 'Panaderia Sur',
      workspaceRole: 'viewer',
    };

    expect(getDisplayInitials('Panaderia Norte')).toBe('PN');
    expect(getCurrentWorkspaceCardState(currentWorkspace, 'owner')).toEqual({
      detailLabel: 'Acceso compartido · Propietario',
      initials: 'PN',
      name: 'Panaderia Norte',
      roleLabel: 'Propietario',
      statusLabel: 'Compartido',
      typeLabel: 'Compartido',
    });
    expect(
      getCurrentWorkspaceCardState({ isRemote: false, name: 'Local' }, 'local'),
    ).toEqual(
      expect.objectContaining({
        detailLabel: 'Solo tu puedes ver la información',
      }),
    );
    expect(getWorkspaceTypeLabel(otherWorkspace)).toBe('Solo lectura');
    expect(getWorkspaceRowState(currentWorkspace, currentWorkspace)).toEqual(
      expect.objectContaining({
        isCurrent: true,
        name: 'Panaderia Norte',
        typeLabel: 'Propietario',
      }),
    );
    expect(getWorkspaceRowState(otherWorkspace, currentWorkspace)).toEqual(
      expect.objectContaining({
        isCurrent: false,
        name: 'Panaderia Sur',
      }),
    );
    expect(
      JSON.stringify(getCurrentWorkspaceCardState(currentWorkspace, 'owner')),
    ).not.toContain('workspace_secret_group');
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
        inviteTokenExpiresAt: '2026-02-03T00:00:00.000Z',
        invitedBy: {
          displayName: 'Duenio',
          email: 'owner@example.test',
        },
        invitationId: 'invitation_1',
        refreshToken: 'secret',
        role: 'viewer',
        status: 'invited',
        workspace: {
          name: 'Panaderia Norte',
        },
      }),
    ).toEqual({
      emailDelivery: {
        provider: 'http',
        sent: false,
        status: 'failed',
      },
      emailDeliveryLabel: 'Email: fallo (http)',
      email: 'invitee@example.test',
      expiresLabel: 'Expira: 2026-02-03',
      invitationId: 'invitation_1',
      inviteLinkCreatedAt: null,
      inviteTokenExpiresAt: '2026-02-03T00:00:00.000Z',
      invitedByLabel: 'Duenio',
      role: 'Solo lectura',
      status: 'Pendiente',
      statusKey: 'invited',
      statusTone: 'warning',
      workspaceName: 'Panaderia Norte',
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
      sanitizeInvitationForDisplay({
        email: 'invitee@example.test',
        invitationId: 'invitation_2',
      }).emailDeliveryLabel,
    ).toBeNull();
    expect(
      getInvitationFormState({
        email: 'bad-email',
        existingInvitations: [],
      }),
    ).toEqual({
      alreadyMember: false,
      alreadyInvited: false,
      canSubmit: false,
      error: 'Escribe un correo valido.',
      normalizedEmail: 'bad-email',
    });
    expect(
      getInvitationFormState({
        email: 'INVITEE@example.test',
        existingInvitations: [
          { email: 'invitee@example.test', status: 'invited' },
        ],
      }),
    ).toEqual({
      alreadyMember: false,
      alreadyInvited: true,
      canSubmit: false,
      error: 'Este correo ya tiene una invitacion pendiente.',
      normalizedEmail: 'invitee@example.test',
    });
    expect(
      getInvitationFormState({
        email: 'member@example.test',
        existingInvitations: [],
        existingMembers: [
          { email: 'member@example.test', statusKey: 'active' },
        ],
      }),
    ).toEqual({
      alreadyMember: true,
      alreadyInvited: false,
      canSubmit: false,
      error: 'Este usuario ya pertenece al equipo.',
      normalizedEmail: 'member@example.test',
    });
    expect(
      JSON.stringify(
        sanitizeInvitationForDisplay({
          devInviteLink: 'isabake://invite/dev_token',
          inviteTokenHash: 'hash_secret',
        }),
      ),
    ).not.toContain('dev_token');
  });

  test('validates new workspace names against existing workspaces', () => {
    expect(
      getWorkspaceNameFormState({
        existingWorkspaces: [{ name: 'Panaderia Norte' }],
        name: '  panaderia norte ',
      }),
    ).toEqual({
      alreadyExists: true,
      canSubmit: false,
      error: 'Ya existe un negocio con ese nombre.',
      normalizedName: 'panaderia norte',
    });
    expect(
      getWorkspaceNameFormState({
        existingWorkspaces: [{ name: 'Panaderia Norte' }],
        name: 'Panaderia Sur',
      }),
    ).toEqual({
      alreadyExists: false,
      canSubmit: true,
      error: null,
      normalizedName: 'Panaderia Sur',
    });
  });

  test('formats workspace roles, statuses, email delivery, and safe errors', () => {
    expect(formatWorkspaceRole('owner')).toBe('Propietario');
    expect(formatWorkspaceRole('viewer')).toBe('Solo lectura');
    expect(formatMembershipStatus('active')).toBe('Activo');
    expect(formatMembershipStatus('removed')).toBe('Removido');
    expect(formatInvitationStatus('expired')).toBe('Expirada');
    expect(
      formatEmailDeliveryStatus({ provider: 'http', status: 'sent' }),
    ).toBe('Email: enviado (http)');
    expect(formatEmailDeliveryStatus()).toBeNull();
    expect(formatWorkspaceError('workspace_admin_required')).toBe(
      'Solo propietarios y administradores pueden realizar esta accion.',
    );
    expect(formatWorkspaceError('workspace_owner_required')).toBe(
      'Solo el propietario puede eliminar el negocio.',
    );
    expect(formatWorkspaceError('workspace_owner_self_required')).toBe(
      'Solo el propietario puede salir o cambiar su propio rol.',
    );
    expect(formatWorkspaceError('workspace_name_already_exists')).toBe(
      'Ya existe un negocio con ese nombre.',
    );
    expect(formatWorkspaceError('invitation_email_mismatch')).toBe(
      'Debes iniciar sesion con el correo invitado para aceptar o rechazar esta invitacion.',
    );
    expect(formatWorkspaceError('invitation_not_active')).toBe(
      'Esta invitacion ya fue usada, rechazada o revocada.',
    );
    expect(formatWorkspaceError('invitation_not_found')).toBe(
      'No se encontro una invitacion pendiente para esta accion.',
    );
  });

  test('returns workspace empty states and disabled invitation actions by role/status', () => {
    expect(getWorkspaceEmptyState({ type: 'members' })).toBe(
      'No hay miembros para mostrar.',
    );
    expect(getWorkspaceEmptyState({ authRequired: true })).toBe(
      'Inicia sesion para ver negocios compartidos.',
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
    ).toBe(
      'Solo propietarios y administradores pueden administrar invitaciones.',
    );
  });

  test('filters removed members and disables unsafe member actions', () => {
    expect(
      getVisibleMembersForDisplay([
        {
          displayName: 'Ana',
          role: 'owner',
          status: 'active',
          userId: 'user_1',
        },
        {
          displayName: 'Beto',
          role: 'member',
          status: 'removed',
          userId: 'user_2',
        },
      ]),
    ).toEqual([
      expect.objectContaining({
        displayName: 'Ana',
        role: 'Propietario',
        status: 'Activo',
      }),
    ]);

    expect(
      getMemberActionState({
        member: {
          isCurrentUser: false,
          roleKey: 'member',
          statusKey: 'active',
        },
        role: 'admin',
      }),
    ).toEqual({
      actionLabel: 'Remover',
      canRemove: true,
      disabledReason: null,
      showAction: true,
    });
    expect(
      getMemberActionState({
        member: { isCurrentUser: true, roleKey: 'admin', statusKey: 'active' },
        role: 'admin',
      }),
    ).toEqual({
      actionLabel: 'Salir',
      canRemove: true,
      disabledReason: null,
      showAction: true,
    });
    expect(
      getMemberActionState({
        member: { isCurrentUser: false, roleKey: 'owner', statusKey: 'active' },
        role: 'admin',
      }),
    ).toEqual({
      actionLabel: 'Remover',
      canRemove: false,
      disabledReason: 'Solo el propietario puede salir por su cuenta.',
      showAction: false,
    });
    expect(
      getMemberActionState({
        member: { roleKey: 'member', statusKey: 'removed' },
        role: 'admin',
      }).canRemove,
    ).toBe(false);
    expect(
      getMemberActionState({
        member: {
          isCurrentUser: true,
          lastActiveOwner: true,
          roleKey: 'owner',
          statusKey: 'active',
        },
        role: 'owner',
      }),
    ).toEqual({
      actionLabel: 'Salir',
      canRemove: false,
      disabledReason: 'Antes de salir, asigna un nuevo propietario.',
      showAction: false,
    });
    expect(
      getMemberActionState({
        member: {
          isCurrentUser: true,
          lastActiveOwner: false,
          roleKey: 'owner',
          statusKey: 'active',
        },
        role: 'owner',
      }),
    ).toEqual({
      actionLabel: 'Salir',
      canRemove: true,
      disabledReason: null,
      showAction: true,
    });
    expect(
      getMemberActionState({
        member: { roleKey: 'member', statusKey: 'active' },
        role: 'viewer',
      }).canRemove,
    ).toBe(false);
  });

  test('blocks leaving when current owner is the only active owner', () => {
    const workspace = { groupId: 'group_1', isRemote: true };

    expect(
      getLeaveWorkspaceBlockedReason({
        members: [
          {
            isCurrentUser: true,
            roleKey: 'owner',
            statusKey: 'active',
          },
        ],
        workspace,
      }),
    ).toBe(
      'Eres la unica persona en este negocio. Antes de salir, agrega a otra persona o elimina el negocio si ya no lo necesitas.',
    );

    expect(
      getLeaveWorkspaceBlockedReason({
        members: [
          {
            isCurrentUser: true,
            roleKey: 'owner',
            statusKey: 'active',
          },
          {
            isCurrentUser: false,
            roleKey: 'member',
            statusKey: 'active',
          },
        ],
        workspace,
      }),
    ).toBe(
      'Eres el unico propietario activo. Antes de salir, asigna a otra persona como propietario.',
    );

    expect(
      getLeaveWorkspaceBlockedReason({
        members: [
          {
            isCurrentUser: true,
            roleKey: 'owner',
            statusKey: 'active',
          },
          {
            isCurrentUser: false,
            roleKey: 'owner',
            statusKey: 'active',
          },
        ],
        workspace,
      }),
    ).toBeNull();
  });

  test('shows leave action only when workspace can be left', () => {
    const workspace = { groupId: 'group_1', isRemote: true };

    expect(
      getWorkspaceLeaveActionState({
        members: [],
        workspace: { ...workspace, workspaceRole: 'member' },
      }),
    ).toEqual({
      blockedReason: null,
      canLeave: true,
      showAction: true,
    });

    expect(
      getWorkspaceLeaveActionState({
        members: [],
        workspace: { ...workspace, workspaceRole: 'owner' },
      }),
    ).toEqual({
      blockedReason: null,
      canLeave: false,
      showAction: false,
    });

    expect(
      getWorkspaceLeaveActionState({
        members: [
          {
            isCurrentUser: true,
            roleKey: 'owner',
            statusKey: 'active',
          },
        ],
        workspace: { ...workspace, workspaceRole: 'owner' },
      }),
    ).toEqual({
      blockedReason:
        'Eres la unica persona en este negocio. Antes de salir, agrega a otra persona o elimina el negocio si ya no lo necesitas.',
      canLeave: false,
      showAction: false,
    });

    expect(
      getWorkspaceLeaveActionState({
        members: [
          {
            isCurrentUser: true,
            roleKey: 'owner',
            statusKey: 'active',
          },
          {
            isCurrentUser: false,
            roleKey: 'owner',
            statusKey: 'active',
          },
        ],
        workspace: { ...workspace, workspaceRole: 'owner' },
      }),
    ).toEqual({
      blockedReason: null,
      canLeave: true,
      showAction: true,
    });
  });

  test('workspace screen refreshes received invitations and uses icon attention', () => {
    const workspaceScreenSource = fs.readFileSync(
      path.join(__dirname, 'WorkspaceScreen.js'),
      'utf8',
    );
    const workspacePartsSource = fs.readFileSync(
      path.join(__dirname, 'WorkspaceScreenParts.js'),
      'utf8',
    );

    expect(workspaceScreenSource).toContain(
      'workspaceState.refreshMyInvitations().catch',
    );
    expect(workspacePartsSource).toContain('name="notification-attention"');
  });

  test('account-required modal is not nested inside project modal', () => {
    const workspacePartsSource = fs.readFileSync(
      path.join(__dirname, 'WorkspaceScreenParts.js'),
      'utf8',
    );
    const createWorkspaceSource = workspacePartsSource.slice(
      workspacePartsSource.indexOf('function CreateWorkspaceDialog'),
      workspacePartsSource.indexOf('export function WorkspacesTab'),
    );

    expect(createWorkspaceSource).toContain('AccountRequiredOverlay');
    expect(createWorkspaceSource).not.toContain('AccountRequiredDialog');
  });

  test('workspace admin does not show operational success feedback', () => {
    const workspaceScreenSource = fs.readFileSync(
      path.join(__dirname, 'WorkspaceScreen.js'),
      'utf8',
    );

    expect(workspaceScreenSource).not.toContain('showActionMessages');
    expect(workspaceScreenSource).not.toContain('Negocios actualizados.');
    expect(workspaceScreenSource).not.toContain('Negocio seleccionado.');
    expect(workspaceScreenSource).not.toContain('Invitacion creada.');
    expect(workspaceScreenSource).not.toContain('Colaborador removido.');
    expect(workspaceScreenSource).toContain('setMessage(nextMessage)');
  });

  test('workspace overflow menu closes before hardware back navigation', () => {
    const workspaceScreenSource = fs.readFileSync(
      path.join(__dirname, 'WorkspaceScreen.js'),
      'utf8',
    );

    expect(workspaceScreenSource).toContain('if (workspaceMenuKey)');
    expect(workspaceScreenSource).toContain('setWorkspaceMenuKey(null)');
    expect(workspaceScreenSource).toContain('style={styles.screenDismissLayer}');
    expect(workspaceScreenSource.indexOf('if (workspaceMenuKey)')).toBeLessThan(
      workspaceScreenSource.indexOf('onBack();'),
    );
  });
});
