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

  test('parses triple-slash app scheme invitation links', () => {
    expect(getInvitationTokenFromUrl('isabake:///invite/token_123')).toBe(
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

  test('parses encoded token and ignores query params', () => {
    expect(
      parseInvitationLink(
        'https://app.example.test/invite/token%2Bencoded?utm=mail',
      ),
    ).toEqual({
      error: null,
      ok: true,
      token: 'token+encoded',
    });
  });

  test('rejects unknown paths and missing tokens safely', () => {
    expect(parseInvitationLink('https://app.example.test/workspace/token')).toEqual({
      error: 'invalid_invitation_link',
      ok: false,
      token: null,
    });
    expect(parseInvitationLink('https://app.example.test/invite')).toEqual({
      error: 'invalid_invitation_link',
      ok: false,
      token: null,
    });
    expect(parseInvitationLink('isabake:///invite/')).toEqual({
      error: 'invalid_invitation_link',
      ok: false,
      token: null,
    });
  });

  test('returns safe error for invalid invitation links', () => {
    expect(parseInvitationLink('not a link')).toEqual({
      error: 'invalid_invitation_link',
      ok: false,
      token: null,
    });
    expect(parseInvitationLink('ftp://app.example.test/invite/token')).toEqual({
      error: 'invalid_invitation_link',
      ok: false,
      token: null,
    });
  });
});
