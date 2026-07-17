import { parseInvitationLink } from './invitationLink';

export const createInvitationNavigationState = (url = '') => {
  const parsed = parseInvitationLink(url);

  if (!parsed.ok) {
    return {
      activeTab: null,
      error: parsed.error,
      inviteToken: null,
      ok: false,
    };
  }

  return {
    activeTab: 'invite',
    error: null,
    inviteToken: parsed.token,
    ok: true,
  };
};

export const shouldRouteInvitationLink = (url = '') =>
  createInvitationNavigationState(url).ok;

export default {
  createInvitationNavigationState,
  shouldRouteInvitationLink,
};
