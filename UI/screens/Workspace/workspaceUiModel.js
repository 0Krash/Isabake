export {
  dedupeWorkspaces,
  getWorkspaceListKey,
  normalizeWorkspaceId,
} from '../../data/workspace/workspaceListModel';

export const getWorkspaceModeLabel = (workspace) =>
  workspace?.isRemote ? 'Compartido' : 'Solo local';

export const isTechnicalWorkspaceName = (name = '') =>
  /^(phase_|ws_|workspace_|group_|local_)/i.test(String(name || '').trim()) ||
  /_phase_\d+/i.test(String(name || ''));

export const formatWorkspaceName = (workspace = {}) => {
  const name = String(workspace?.name || '').trim();

  if (!name || isTechnicalWorkspaceName(name)) {
    return workspace?.isRemote ? 'Negocio compartido' : 'Solo en este dispositivo';
  }

  return name;
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

export const formatEmailDeliveryStatus = (emailDelivery = null) => {
  if (!emailDelivery) {
    return 'Email: sin estado de envio';
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
    return 'Inicia sesion para administrar workspaces compartidos. El modo local sigue disponible.';
  }

  if (message.includes('workspace_admin_required')) {
    return 'Solo propietarios y administradores pueden realizar esta accion.';
  }

  if (message.includes('last_owner_required')) {
    return 'Debe quedar al menos un propietario activo en el workspace.';
  }

  if (message.includes('invitation_email_mismatch')) {
    return 'Debes iniciar sesion con el correo invitado para aceptar esta invitacion.';
  }

  if (message.includes('invitation_expired')) {
    return 'La invitacion expiro. Solicita una nueva invitacion.';
  }

  return 'No se pudo completar la accion de workspace.';
};

export const getWorkspaceEmptyState = ({
  authRequired = false,
  currentWorkspace = null,
  error = null,
  loading = false,
  type = 'workspaces',
} = {}) => {
  if (loading) {
    return 'Cargando informacion de workspace...';
  }

  if (error) {
    return formatWorkspaceError(error);
  }

  if (authRequired) {
    return 'Inicia sesion para ver workspaces compartidos. El modo local sigue disponible.';
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
    return 'No hay workspace seleccionado. Puedes seguir en modo local.';
  }

  return 'No hay workspaces compartidos disponibles.';
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

export const sanitizeMemberForDisplay = (member = {}) => ({
  role: formatWorkspaceRole(member.role || 'member'),
  status: formatMembershipStatus(member.status || 'active'),
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
    emailDeliveryLabel: formatEmailDeliveryStatus(emailDelivery),
    invitationId: invitation.invitationId || null,
    inviteLinkCreatedAt: invitation.inviteLinkCreatedAt || null,
    inviteTokenExpiresAt: invitation.inviteTokenExpiresAt || null,
    role: formatWorkspaceRole(invitation.role || 'member'),
    status: formatInvitationStatus(invitation.status || 'invited'),
    statusKey: invitation.status || 'invited',
  };
};
