export const formatInvitationAcceptError = (error) => {
  const message = String(error?.message || error || '');

  if (!message) {
    return null;
  }

  if (message.includes('auth_required')) {
    return 'Inicia sesion con el correo invitado para aceptar o rechazar.';
  }

  if (message.includes('invitation_email_mismatch')) {
    return 'Esta invitacion pertenece a otro correo. Cambia de cuenta para continuar.';
  }

  if (
    message.includes('invitation_expired') ||
    message.includes('invitation_token_expired')
  ) {
    return 'Esta invitacion expiro. Solicita una nueva invitacion.';
  }

  if (message.includes('invitation_not_active')) {
    return 'Esta invitacion ya fue usada, rechazada o revocada.';
  }

  if (message.includes('invitation_not_found')) {
    return 'No se encontro una invitacion activa para este link.';
  }

  if (message.includes('invalid_invitation_link')) {
    return 'El link de invitacion no es valido.';
  }

  return 'No se pudo completar la accion de invitacion.';
};

export const formatInvitationPreviewStatus = (status = 'invited') => {
  const labels = {
    accepted: 'Aceptada',
    declined: 'Rechazada',
    expired: 'Expirada',
    invited: 'Pendiente',
    revoked: 'Revocada',
  };

  return labels[status] || 'Estado desconocido';
};

export const getInvitationAcceptActionState = ({
  authRequired = false,
  loading = false,
  preview = null,
} = {}) => {
  const status = preview?.status || null;
  const isPending = !status || status === 'invited';
  const disabledReason = authRequired
    ? 'Inicia sesion con el correo invitado.'
    : !isPending
      ? 'Esta invitacion ya no esta pendiente.'
      : null;

  return {
    canAccept: Boolean(preview) && !loading && !authRequired && isPending,
    canDecline: Boolean(preview) && !loading && !authRequired && isPending,
    disabledReason,
  };
};

export const runSafeInvitationAction = async ({
  action,
  getToken,
  setError,
  setLoading,
  setMessage,
  successMessage,
} = {}) => {
  setError?.(null);
  setMessage?.(null);
  const token = getToken?.();

  if (!token) {
    const error = formatInvitationAcceptError('invalid_invitation_link');
    setError?.(error);
    return {
      error,
      ok: false,
    };
  }

  setLoading?.(true);

  try {
    const result = await action(token);
    setMessage?.(successMessage);
    return {
      ok: true,
      result,
    };
  } catch (nextError) {
    const message = formatInvitationAcceptError(nextError);
    setError?.(message);
    return {
      error: message,
      ok: false,
    };
  } finally {
    setLoading?.(false);
  }
};

export default {
  runSafeInvitationAction,
};
