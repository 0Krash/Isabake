import {
  dedupeWorkspaces,
  getWorkspaceListKey,
  normalizeWorkspaceId,
} from '../../data/workspace/workspaceListModel';

export { dedupeWorkspaces, getWorkspaceListKey, normalizeWorkspaceId };

export const workspaceTabs = [
  { key: 'team', label: 'Equipo' },
  { key: 'invitations', label: 'Invitaciones' },
  { key: 'workspaces', label: 'Proyectos' },
];

export const getWorkspaceTabState = (activeTab = 'team') =>
  workspaceTabs.map((tab) => ({
    ...tab,
    active: tab.key === activeTab,
  }));

export const getWorkspaceModeLabel = (workspace) =>
  workspace?.isRemote ? 'Compartido' : 'Trabajando localmente';

export const isTechnicalWorkspaceName = (name = '') =>
  /^(phase_|ws_|workspace_|group_|local_)/i.test(String(name || '').trim()) ||
  /_phase_\d+/i.test(String(name || ''));

export const formatWorkspaceName = (workspace = {}) => {
  const name = String(workspace?.name || '').trim();

  if (!name || isTechnicalWorkspaceName(name)) {
    return workspace?.isRemote
      ? 'Proyecto compartido'
      : 'Solo en este dispositivo';
  }

  return name;
};

export const getWorkspaceOwnershipLabel = (workspace = {}) => {
  if (!workspace?.isRemote) {
    return 'Este proyecto esta en este dispositivo';
  }

  return formatWorkspaceRole(workspace.workspaceRole || 'member');
};

export const formatWorkspaceRole = (role = 'local') => {
  const labels = {
    admin: 'Administrador',
    local: 'Local',
    member: 'Miembro',
    owner: 'Propietario',
    viewer: 'Solo lectura',
  };

  return labels[role] || labels.member;
};

export const formatWorkspaceRoleDescription = (role = 'member') => {
  const descriptions = {
    admin:
      'Puede administrar usuarios, invitaciones y editar datos del proyecto.',
    member: 'Puede crear y editar datos del proyecto compartido.',
    owner: 'Control total del proyecto, usuarios e invitaciones.',
    viewer: 'Puede consultar la informacion sin editarla.',
  };

  return descriptions[role] || descriptions.member;
};

export const formatWorkspaceDate = (value = null) => {
  if (!value) {
    return 'Sin fecha registrada';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Sin fecha registrada';
  }

  return date.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

export const formatMembershipStatus = (status = 'active') => {
  const labels = {
    active: 'Activo',
    invited: 'Invitado',
    removed: 'Removido',
  };

  return labels[status] || 'Estado desconocido';
};

export const formatInvitationStatus = (status = 'invited') => {
  const labels = {
    accepted: 'Aceptada',
    declined: 'Rechazada',
    expired: 'Expirada',
    invited: 'Pendiente',
    revoked: 'Revocada',
  };

  return labels[status] || 'Estado desconocido';
};

export const getStatusTone = (status = '') => {
  if (['accepted', 'active', 'synced'].includes(status)) {
    return 'success';
  }

  if (['expired', 'invited', 'pending'].includes(status)) {
    return 'warning';
  }

  if (['declined', 'removed', 'revoked'].includes(status)) {
    return 'danger';
  }

  return 'neutral';
};

export const formatEmailDeliveryStatus = (emailDelivery = null) => {
  if (!emailDelivery) {
    return null;
  }

  const provider = emailDelivery.provider || 'proveedor desconocido';
  const labels = {
    failed: 'fallo',
    not_configured: 'no configurado',
    sent: 'enviado',
    skipped: 'pendiente de proveedor',
  };
  const status = labels[emailDelivery.status] || 'estado desconocido';

  return `Email: ${status} (${provider})`;
};

export const formatWorkspaceError = (error) => {
  const message = String(error?.message || error || '');

  if (!message) {
    return null;
  }

  if (message.includes('auth_required')) {
    return 'Inicia sesion para administrar proyectos compartidos. El modo local sigue disponible.';
  }

  if (message.includes('workspace_admin_required')) {
    return 'Solo propietarios y administradores pueden realizar esta accion.';
  }

  if (message.includes('workspace_owner_required')) {
    return 'Solo el propietario puede eliminar el proyecto.';
  }

  if (message.includes('workspace_owner_self_required')) {
    return 'Solo el propietario puede salir o cambiar su propio rol.';
  }

  if (
    message.includes('workspace_name_already_exists') ||
    message.includes('workspace_already_exists')
  ) {
    return 'Ya existe un proyecto con ese nombre.';
  }

  if (message.includes('workspace_member_already_exists')) {
    return 'Este usuario ya pertenece al equipo.';
  }

  if (message.includes('last_owner_required')) {
    return 'Debe quedar al menos un propietario activo en el proyecto.';
  }

  if (message.includes('invitation_email_mismatch')) {
    return 'Debes iniciar sesion con el correo invitado para aceptar o rechazar esta invitacion.';
  }

  if (message.includes('invitation_expired')) {
    return 'La invitacion expiro. Solicita una nueva invitacion.';
  }

  if (message.includes('invitation_not_active')) {
    return 'Esta invitacion ya fue usada, rechazada o revocada.';
  }

  if (message.includes('invitation_not_found')) {
    return 'No se encontro una invitacion pendiente para esta accion.';
  }

  return 'No se pudo completar la accion del proyecto.';
};

export const getWorkspaceEmptyState = ({
  authRequired = false,
  currentWorkspace = null,
  error = null,
  loading = false,
  type = 'workspaces',
} = {}) => {
  if (loading) {
    return 'Cargando informacion del proyecto...';
  }

  if (error) {
    return formatWorkspaceError(error);
  }

  if (authRequired) {
    return 'Inicia sesion para ver proyectos compartidos. El modo local sigue disponible.';
  }

  if (type === 'members') {
    return 'No hay miembros para mostrar.';
  }

  if (type === 'invitations') {
    return 'No hay invitaciones pendientes.';
  }

  if (type === 'myInvitations') {
    return 'No tienes invitaciones pendientes.';
  }

  if (!currentWorkspace) {
    return 'No hay proyecto seleccionado. Puedes seguir trabajando localmente.';
  }

  return 'No hay proyectos compartidos disponibles.';
};

export const getInvitationActionState = ({
  invitation = {},
  loading = false,
  role = 'member',
} = {}) => {
  const canAdmin = ['owner', 'admin'].includes(role);
  const isPending = (invitation.status || 'invited') === 'invited';
  const disabledReason = !canAdmin
    ? 'Solo propietarios y administradores pueden administrar invitaciones.'
    : !isPending
      ? 'Esta invitacion ya no esta pendiente.'
      : null;

  return {
    canRegenerate: !loading && canAdmin && isPending,
    canRevoke: !loading && canAdmin && isPending,
    disabledReason,
  };
};

export const getMemberDisplayName = (member = {}) => {
  const displayName = String(member.displayName || member.name || '').trim();
  const email = String(member.email || '').trim();

  return displayName || email || 'Usuario sin nombre';
};

export const getMemberEmail = (member = {}) =>
  String(member.email || '').trim();

export const getDisplayInitials = (label = '') => {
  const parts = String(label || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) {
    return '?';
  }

  return parts
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
};

export const sanitizeMemberForDisplay = (member = {}) => {
  const statusKey = member.status || 'active';
  const displayName = getMemberDisplayName(member);
  const email = getMemberEmail(member);

  return {
    createdAt: member.createdAt || null,
    displayName,
    email,
    initials: getDisplayInitials(displayName || email),
    isCurrentUser: Boolean(member.isCurrentUser),
    role: formatWorkspaceRole(member.role || 'member'),
    roleKey: member.role || 'member',
    status: formatMembershipStatus(statusKey),
    statusKey,
    statusTone: getStatusTone(statusKey),
    updatedAt: member.updatedAt || null,
    userId: member.userId || member.email || 'sin_usuario',
  };
};

export const getVisibleMembersForDisplay = (members = []) =>
  members
    .map(sanitizeMemberForDisplay)
    .filter((member) => member.statusKey !== 'removed');

export const getLeaveWorkspaceBlockedReason = ({
  members = [],
  workspace = {},
} = {}) => {
  if (!workspace?.isRemote || !Array.isArray(members) || !members.length) {
    return null;
  }

  if (members.length <= 1) {
    return 'Eres la unica persona en este proyecto. Antes de salir, agrega a otra persona o elimina el proyecto si ya no lo necesitas.';
  }

  const currentMember = members.find((member) => member.isCurrentUser);
  const activeOwnerCount = members.filter(
    (member) => member.roleKey === 'owner',
  ).length;

  if (currentMember?.roleKey === 'owner' && activeOwnerCount <= 1) {
    return 'Eres el unico propietario activo. Antes de salir, asigna a otra persona como propietario.';
  }

  return null;
};

export const getMemberActionState = ({
  loading = false,
  member = {},
  role = 'member',
} = {}) => {
  const canAdmin = ['owner', 'admin'].includes(role);
  const isRemoved =
    member.statusKey === 'removed' || member.status === 'Removido';
  const isCurrentUser = Boolean(member.isCurrentUser);
  const isOwner = member.roleKey === 'owner';
  const isLastOwner =
    member.roleKey === 'owner' && member.lastActiveOwner === true;
  const showAction = (isCurrentUser && !isOwner) || (canAdmin && !isOwner);
  const canRemove =
    !loading &&
    showAction &&
    !isRemoved &&
    (!isOwner || isCurrentUser) &&
    !isLastOwner;

  return {
    actionLabel: isCurrentUser ? 'Salir' : 'Remover',
    canRemove,
    disabledReason: isRemoved
      ? 'Este colaborador ya fue removido.'
      : isLastOwner && isCurrentUser
        ? 'Antes de salir, asigna un nuevo propietario.'
        : isOwner && !isCurrentUser
          ? 'Solo el propietario puede salir por su cuenta.'
          : !canAdmin && !isCurrentUser
            ? 'Solo propietarios y administradores pueden administrar colaboradores.'
            : null,
    showAction,
  };
};

export const isValidInvitationEmail = (email = '') =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());

export const getInvitationFormState = ({
  email = '',
  existingInvitations = [],
  existingMembers = [],
} = {}) => {
  const normalizedEmail = String(email || '')
    .trim()
    .toLowerCase();
  const invalid =
    Boolean(normalizedEmail) && !isValidInvitationEmail(normalizedEmail);
  const alreadyMember =
    Boolean(normalizedEmail) &&
    existingMembers.some((member) => {
      const memberEmail = String(member.email || '')
        .trim()
        .toLowerCase();
      const status = member.statusKey || member.status || 'active';
      return memberEmail === normalizedEmail && status !== 'removed';
    });
  const alreadyInvited =
    Boolean(normalizedEmail) &&
    existingInvitations.some((invitation) => {
      const invitationEmail = String(invitation.email || '')
        .trim()
        .toLowerCase();
      const status = invitation.status || 'invited';
      return invitationEmail === normalizedEmail && status === 'invited';
    });

  return {
    alreadyMember,
    alreadyInvited,
    canSubmit:
      Boolean(normalizedEmail) && !invalid && !alreadyMember && !alreadyInvited,
    error: invalid
      ? 'Escribe un correo valido.'
      : alreadyMember
        ? 'Este usuario ya pertenece al equipo.'
        : alreadyInvited
          ? 'Este correo ya tiene una invitacion pendiente.'
          : null,
    normalizedEmail,
  };
};

export const getWorkspaceNameFormState = ({
  existingWorkspaces = [],
  name = '',
  workspaceId = null,
} = {}) => {
  const normalizedName = String(name || '').trim();
  const nameKey = normalizedName.toLowerCase();
  const alreadyExists =
    Boolean(nameKey) &&
    existingWorkspaces.some(
      (workspace) =>
        getWorkspaceListKey(workspace) !== workspaceId &&
        String(workspace?.name || '')
          .trim()
          .toLowerCase() === nameKey,
    );

  return {
    alreadyExists,
    canSubmit: Boolean(normalizedName) && !alreadyExists,
    error: alreadyExists
      ? 'Ya existe un proyecto con ese nombre.'
      : !normalizedName
        ? 'Agrega un nombre para el proyecto.'
        : null,
    normalizedName,
  };
};

export const dedupeWorkspaceDisplayList = (
  workspaces = [],
  currentWorkspace = null,
) => {
  const currentKey = getWorkspaceListKey(currentWorkspace || {});
  const seen = new Set();
  const seenIndexByKey = new Map();
  const result = [];

  workspaces.forEach((workspace) => {
    const key = getWorkspaceListKey(workspace);
    const nameKey = [
      workspace?.isRemote ? 'remote' : 'local',
      String(workspace?.name || '')
        .trim()
        .toLowerCase(),
    ].join(':');
    const identityKey = key || nameKey;
    const duplicateKey = seen.has(identityKey) || seen.has(nameKey);

    if (duplicateKey) {
      const previousIndex =
        seenIndexByKey.get(identityKey) ?? seenIndexByKey.get(nameKey);

      if (key === currentKey && previousIndex !== undefined) {
        result[previousIndex] = workspace;
      }

      return;
    }

    seen.add(identityKey);
    seen.add(nameKey);
    seenIndexByKey.set(identityKey, result.length);
    seenIndexByKey.set(nameKey, result.length);
    result.push(workspace);
  });

  return result;
};

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
  const invitedBy = invitation.invitedBy || {};
  const workspace = invitation.workspace || {};
  const expiresAt =
    invitation.inviteTokenExpiresAt || invitation.expiresAt || null;
  const invitedByLabel =
    invitedBy.displayName ||
    invitedBy.email ||
    invitation.invitedByUserId ||
    'Un administrador';
  const workspaceName =
    workspace.name || invitation.workspaceName || 'Proyecto compartido';

  return {
    ...(exposeDevInviteLink && invitation.devInviteLink
      ? { devInviteLink: invitation.devInviteLink }
      : {}),
    ...(emailDelivery ? { emailDelivery } : {}),
    email: invitation.email || 'sin_correo',
    emailDeliveryLabel: formatEmailDeliveryStatus(emailDelivery),
    invitationId: invitation.invitationId || null,
    inviteLinkCreatedAt: invitation.inviteLinkCreatedAt || null,
    inviteTokenExpiresAt: invitation.inviteTokenExpiresAt || null,
    invitedByLabel,
    role: formatWorkspaceRole(invitation.role || 'member'),
    status: formatInvitationStatus(invitation.status || 'invited'),
    statusKey: invitation.status || 'invited',
    statusTone: getStatusTone(invitation.status || 'invited'),
    workspaceName,
    expiresLabel: expiresAt
      ? `Expira: ${String(expiresAt).slice(0, 10)}`
      : 'Sin fecha de expiracion',
  };
};

export const getWorkspaceTypeLabel = (workspace = {}) => {
  if (!workspace?.isRemote) {
    return 'Proyecto privado';
  }

  return `${formatWorkspaceRole(
    workspace.workspaceRole || workspace.syncStatus || 'member',
  )}`;
};

export const getWorkspaceStatusLabel = (workspace = {}) =>
  workspace?.isRemote ? 'Compartido' : 'Trabajando localmente';

export const getWorkspaceRowState = (workspace = {}, currentWorkspace = {}) => {
  const workspaceKey = getWorkspaceListKey(workspace);
  const currentKey = getWorkspaceListKey(currentWorkspace || {});

  return {
    initials: getDisplayInitials(formatWorkspaceName(workspace)),
    isCurrent: workspaceKey === currentKey,
    currentLabel: workspaceKey === currentKey ? 'En uso' : null,
    key: workspaceKey,
    name: formatWorkspaceName(workspace),
    statusLabel: getWorkspaceStatusLabel(workspace),
    typeLabel: getWorkspaceTypeLabel(workspace),
  };
};

export const getCurrentWorkspaceCardState = (
  workspace = {},
  role = 'local',
) => ({
  detailLabel: workspace?.isRemote
    ? `Compartido · ${formatWorkspaceRole(role)}`
    : 'Solo tu puedes ver la información',
  initials: getDisplayInitials(formatWorkspaceName(workspace)),
  name: formatWorkspaceName(workspace),
  roleLabel: formatWorkspaceRole(role),
  statusLabel: getWorkspaceStatusLabel(workspace),
  typeLabel: workspace?.isRemote ? 'Compartido' : 'Local',
});
