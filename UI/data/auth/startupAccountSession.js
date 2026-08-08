import { checkSession } from './authService';

export const restoreAccountSessionOnStartup = async ({
  check = checkSession,
} = {}) => {
  try {
    const session = await check();
    return {
      session,
      status: session ? 'connected' : 'local',
    };
  } catch (error) {
    return {
      error: String(error?.message || error),
      session: null,
      status: 'local',
    };
  }
};

export default restoreAccountSessionOnStartup;
