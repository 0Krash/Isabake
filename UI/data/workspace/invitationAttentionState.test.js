import {
  getInvitationAttentionKey,
  isInvitationAttentionSeen,
  markInvitationAttentionSeen,
} from './invitationAttentionState';

describe('invitationAttentionState', () => {
  test('tracks unseen pending invitations by stable key', () => {
    const invitations = [
      { invitationId: 'invitation_b', status: 'invited' },
      { invitationId: 'invitation_a', status: 'invited' },
      { invitationId: 'invitation_old', status: 'accepted' },
    ];

    expect(getInvitationAttentionKey(invitations)).toBe(
      'invitation_a|invitation_b',
    );
    expect(isInvitationAttentionSeen(invitations)).toBe(false);

    markInvitationAttentionSeen(invitations);

    expect(isInvitationAttentionSeen(invitations)).toBe(true);
    expect(
      isInvitationAttentionSeen([
        ...invitations,
        { invitationId: 'invitation_c', status: 'invited' },
      ]),
    ).toBe(false);
  });
});

