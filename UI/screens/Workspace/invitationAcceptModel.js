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
    setError?.('invalid_invitation_link');
    return {
      error: 'invalid_invitation_link',
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
    const message = String(nextError?.message || nextError);
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
