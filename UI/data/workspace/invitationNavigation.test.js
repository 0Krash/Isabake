import {
  createInvitationNavigationState,
  shouldRouteInvitationLink,
} from './invitationNavigation';

describe('invitationNavigation', () => {
  test('routes app scheme invitation links', () => {
    expect(createInvitationNavigationState('isabake://invite/token_1')).toEqual({
      activeTab: 'invite',
      error: null,
      inviteToken: 'token_1',
      ok: true,
    });
  });

  test('routes https invitation links', () => {
    expect(
      createInvitationNavigationState('https://isabake.example/invite/token_2'),
    ).toEqual({
      activeTab: 'invite',
      error: null,
      inviteToken: 'token_2',
      ok: true,
    });
  });

  test('ignores malformed or non-invite links safely', () => {
    expect(shouldRouteInvitationLink('https://isabake.example/workspace')).toBe(
      false,
    );
    expect(createInvitationNavigationState('bad link')).toEqual({
      activeTab: null,
      error: 'invalid_invitation_link',
      inviteToken: null,
      ok: false,
    });
  });
});
