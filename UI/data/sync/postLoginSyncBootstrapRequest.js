export const requestPostLoginSyncBootstrap = (reason = 'login_success') => {
  import('./postLoginSyncBootstrap')
    .then(({ runPostLoginSyncBootstrap }) =>
      runPostLoginSyncBootstrap({ reason }),
    )
    .catch(() => {});
};

export default {
  requestPostLoginSyncBootstrap,
};
