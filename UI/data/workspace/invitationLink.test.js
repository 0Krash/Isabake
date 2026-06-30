import {
  getInvitationTokenFromUrl,
  parseInvitationLink,
} from './invitationLink';

describe('invitationLink', () => {
  test('parses app scheme invitation links', () => {
    expect(getInvitationTokenFromUrl('isabake://invite/token_123')).toBe(
      'token_123',
    );
  });

  test('parses https invitation links', () => {
    expect(
      parseInvitationLink('https://app.example.test/invite/token_456?x=1'),
    ).toEqual({
      error: null,
      ok: true,
      token: 'token_456',
    });
  });

  test('returns safe error for invalid invitation links', () => {
    expect(parseInvitationLink('not a link')).toEqual({
      error: 'invalid_invitation_link',
      ok: false,
      token: null,
    });
  });
});
