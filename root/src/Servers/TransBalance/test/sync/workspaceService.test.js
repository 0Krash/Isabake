const {
  WorkspaceService,
  createInviteLink,
  getInvitationBaseUrl,
  hashInviteToken,
} = require('../../services/workspaceService');
const MemoryWorkspaceRepository = require('./memoryWorkspaceRepository');

const createService = (options = {}) => {
  const repository = new MemoryWorkspaceRepository();
  const emailService = options.emailService || {
    sendWorkspaceInvitationEmail: jest.fn(async () => ({
      provider: 'mock',
      sent: false,
      status: 'skipped',
    })),
  };
  return {
    emailService,
    repository,
    service: new WorkspaceService(repository, { emailService }),
  };
};

const getInviteTokenFromEmail = (emailService) => {
  const call = emailService.sendWorkspaceInvitationEmail.mock.calls.at(-1);
  return call?.[0]?.inviteLink?.split('/').pop();
};

describe('WorkspaceService', () => {
  const originalExposeDevInviteLinks = process.env.EXPOSE_DEV_INVITE_LINKS;
  const originalAppInviteBaseUrl = process.env.APP_INVITE_BASE_URL;
  const originalInvitationBaseUrl = process.env.INVITATION_BASE_URL;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalExposeDevInviteLinks === undefined) {
      delete process.env.EXPOSE_DEV_INVITE_LINKS;
    } else {
      process.env.EXPOSE_DEV_INVITE_LINKS = originalExposeDevInviteLinks;
    }

    if (originalAppInviteBaseUrl === undefined) {
      delete process.env.APP_INVITE_BASE_URL;
    } else {
      process.env.APP_INVITE_BASE_URL = originalAppInviteBaseUrl;
    }

    if (originalInvitationBaseUrl === undefined) {
      delete process.env.INVITATION_BASE_URL;
    } else {
      process.env.INVITATION_BASE_URL = originalInvitationBaseUrl;
    }

    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  test('owner can create workspace and becomes active owner member', async () => {
    const { repository, service } = createService();
    await service.upsertDevUser({
      email: 'owner@example.test',
      userId: 'user_owner',
    });

    const workspace = await service.createWorkspace({
      groupId: 'group_a',
      name: 'Panaderia',
      ownerUserId: 'user_owner',
    });

    expect(workspace).toEqual(
      expect.objectContaining({
        groupId: 'group_a',
        membership: {
          role: 'owner',
          status: 'active',
        },
        ownerUserId: 'user_owner',
        workspaceId: 'group_a',
      }),
    );
    expect(repository.memberships[0]).toEqual(
      expect.objectContaining({
        groupId: 'group_a',
        role: 'owner',
        status: 'active',
        userId: 'user_owner',
      }),
    );
  });

  test('owner cannot create another active workspace with same name', async () => {
    const { service } = createService();

    await service.createWorkspace({
      groupId: 'group_a',
      name: 'Panaderia Norte',
      ownerUserId: 'owner',
    });

    await expect(
      service.createWorkspace({
        groupId: 'group_b',
        name: '  panaderia norte ',
        ownerUserId: 'owner',
      }),
    ).rejects.toMatchObject({
      message: 'workspace_name_already_exists',
      statusCode: 409,
    });
  });

  test('owner can rename workspace and duplicate names are rejected', async () => {
    const { service } = createService();
    await service.createWorkspace({
      groupId: 'group_a',
      name: 'Panaderia Norte',
      ownerUserId: 'owner',
    });
    await service.createWorkspace({
      groupId: 'group_b',
      name: 'Panaderia Sur',
      ownerUserId: 'owner',
    });

    await expect(
      service.updateWorkspace({
        groupId: 'group_a',
        name: 'Panaderia Centro',
        requesterUserId: 'owner',
      }),
    ).resolves.toEqual(expect.objectContaining({ name: 'Panaderia Centro' }));
    await expect(
      service.updateWorkspace({
        groupId: 'group_a',
        name: 'panaderia sur',
        requesterUserId: 'owner',
      }),
    ).rejects.toMatchObject({
      message: 'workspace_name_already_exists',
      statusCode: 409,
    });
  });

  test('invite link builder supports default scheme and configured https base URL', () => {
    delete process.env.APP_INVITE_BASE_URL;
    delete process.env.INVITATION_BASE_URL;

    expect(getInvitationBaseUrl()).toBe('isabake://invite');
    expect(createInviteLink('raw_token')).toBe('isabake://invite/raw_token');

    process.env.APP_INVITE_BASE_URL = 'https://links.example/invite/';

    expect(getInvitationBaseUrl()).toBe('https://links.example/invite');
    expect(createInviteLink('raw_token')).toBe(
      'https://links.example/invite/raw_token',
    );
  });

  test('owner/admin can add members and non-admin cannot', async () => {
    const { service } = createService();
    await service.createWorkspace({
      groupId: 'group_a',
      name: 'Panaderia',
      ownerUserId: 'owner',
    });
    const admin = await service.addMember({
      groupId: 'group_a',
      requesterUserId: 'owner',
      role: 'admin',
      userId: 'admin',
    });
    const member = await service.addMember({
      groupId: 'group_a',
      requesterUserId: 'admin',
      role: 'member',
      userId: 'member',
    });

    await expect(
      service.addMember({
        groupId: 'group_a',
        requesterUserId: 'member',
        role: 'viewer',
        userId: 'viewer',
      }),
    ).rejects.toMatchObject({
      message: 'workspace_admin_required',
      statusCode: 403,
    });
    expect(admin.role).toBe('admin');
    expect(member.role).toBe('member');
  });

  test('cannot invite an active workspace member again', async () => {
    const { service } = createService();
    await service.createWorkspace({
      groupId: 'group_a',
      name: 'Panaderia',
      ownerUserId: 'owner',
    });
    await service.addMember({
      email: 'member@example.test',
      groupId: 'group_a',
      requesterUserId: 'owner',
      role: 'member',
      userId: 'member',
    });

    await expect(
      service.createInvitation({
        email: 'member@example.test',
        groupId: 'group_a',
        requesterUserId: 'owner',
        role: 'member',
      }),
    ).rejects.toMatchObject({
      message: 'workspace_member_already_exists',
      statusCode: 409,
    });
  });

  test.each(['owner', 'admin', 'member'])(
    '%s can push and pull',
    async (role) => {
      const { service } = createService();
      await service.createWorkspace({
        groupId: 'group_a',
        name: 'Panaderia',
        ownerUserId: 'owner',
      });

      if (role !== 'owner') {
        await service.addMember({
          groupId: 'group_a',
          requesterUserId: 'owner',
          role,
          userId: role,
        });
      }

      const userId = role === 'owner' ? 'owner' : role;

      await expect(
        service.assertCanSyncWorkspace({
          action: 'push',
          groupId: 'group_a',
          userId,
        }),
      ).resolves.toEqual(expect.objectContaining({ role }));
      await expect(
        service.assertCanSyncWorkspace({
          action: 'pull',
          groupId: 'group_a',
          userId,
        }),
      ).resolves.toEqual(expect.objectContaining({ role }));
    },
  );

  test('viewer can pull but cannot push', async () => {
    const { service } = createService();
    await service.createWorkspace({
      groupId: 'group_a',
      name: 'Panaderia',
      ownerUserId: 'owner',
    });
    await service.addMember({
      groupId: 'group_a',
      requesterUserId: 'owner',
      role: 'viewer',
      userId: 'viewer',
    });

    await expect(
      service.assertCanSyncWorkspace({
        action: 'pull',
        groupId: 'group_a',
        userId: 'viewer',
      }),
    ).resolves.toEqual(expect.objectContaining({ role: 'viewer' }));
    await expect(
      service.assertCanSyncWorkspace({
        action: 'push',
        groupId: 'group_a',
        userId: 'viewer',
      }),
    ).rejects.toMatchObject({
      message: 'workspace_role_cannot_sync',
      statusCode: 403,
    });
  });

  test.each(['invited', 'removed'])(
    '%s member cannot push or pull',
    async (status) => {
      const { service } = createService();
      await service.createWorkspace({
        groupId: 'group_a',
        name: 'Panaderia',
        ownerUserId: 'owner',
      });
      await service.addMember({
        groupId: 'group_a',
        requesterUserId: 'owner',
        role: 'member',
        status,
        userId: status,
      });

      await expect(
        service.assertCanSyncWorkspace({
          action: 'pull',
          groupId: 'group_a',
          userId: status,
        }),
      ).rejects.toMatchObject({
        message: 'workspace_membership_required',
        statusCode: 403,
      });
    },
  );

  test('listWorkspacesForUser only returns active memberships', async () => {
    const { service } = createService();
    await service.createWorkspace({
      groupId: 'group_a',
      name: 'A',
      ownerUserId: 'owner_a',
    });
    await service.createWorkspace({
      groupId: 'group_b',
      name: 'B',
      ownerUserId: 'owner_b',
    });
    await service.addMember({
      groupId: 'group_a',
      requesterUserId: 'owner_a',
      role: 'member',
      userId: 'user_1',
    });
    await service.addMember({
      groupId: 'group_b',
      requesterUserId: 'owner_b',
      role: 'member',
      status: 'removed',
      userId: 'user_1',
    });

    const workspaces = await service.listWorkspacesForUser('user_1');

    expect(workspaces).toHaveLength(1);
    expect(workspaces[0]).toEqual(
      expect.objectContaining({
        groupId: 'group_a',
        membership: {
          role: 'member',
          status: 'active',
        },
      }),
    );
  });

  test('owner/admin can update and remove members', async () => {
    const { service } = createService();
    await service.createWorkspace({
      groupId: 'group_a',
      name: 'A',
      ownerUserId: 'owner',
    });
    await service.addMember({
      groupId: 'group_a',
      requesterUserId: 'owner',
      role: 'admin',
      userId: 'admin',
    });
    await service.addMember({
      groupId: 'group_a',
      requesterUserId: 'owner',
      role: 'member',
      userId: 'member',
    });

    await expect(
      service.updateMember({
        groupId: 'group_a',
        requesterUserId: 'admin',
        role: 'viewer',
        userId: 'member',
      }),
    ).resolves.toEqual(expect.objectContaining({ role: 'viewer' }));
    await expect(
      service.removeMember({
        groupId: 'group_a',
        requesterUserId: 'owner',
        userId: 'member',
      }),
    ).resolves.toEqual(expect.objectContaining({ status: 'removed' }));
  });

  test('any active member can list safe team identity labels', async () => {
    const { service } = createService();
    await service.createWorkspace({
      groupId: 'group_a',
      name: 'A',
      ownerUserId: 'owner',
    });
    await service.addMember({
      displayName: 'Ana Admin',
      email: 'ana@example.test',
      groupId: 'group_a',
      requesterUserId: 'owner',
      role: 'admin',
      userId: 'admin',
    });
    await service.addMember({
      displayName: 'Beto Member',
      email: 'beto@example.test',
      groupId: 'group_a',
      requesterUserId: 'owner',
      role: 'member',
      userId: 'member',
    });

    const members = await service.getMembers({
      groupId: 'group_a',
      requesterUserId: 'member',
    });

    expect(members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          isCurrentUser: false,
          role: 'owner',
          userId: 'owner',
        }),
        expect.objectContaining({
          displayName: 'Ana Admin',
          email: 'ana@example.test',
          isCurrentUser: false,
          role: 'admin',
          status: 'active',
          userId: 'admin',
        }),
        expect.objectContaining({
          displayName: 'Beto Member',
          email: 'beto@example.test',
          isCurrentUser: true,
          role: 'member',
          status: 'active',
          userId: 'member',
        }),
      ]),
    );
    expect(JSON.stringify(members)).not.toContain('passwordHash');
  });

  test('member/viewer cannot manage members', async () => {
    const { service } = createService();
    await service.createWorkspace({
      groupId: 'group_a',
      name: 'A',
      ownerUserId: 'owner',
    });
    await service.addMember({
      groupId: 'group_a',
      requesterUserId: 'owner',
      role: 'member',
      userId: 'member',
    });

    await expect(
      service.updateMember({
        groupId: 'group_a',
        requesterUserId: 'member',
        role: 'admin',
        userId: 'member',
      }),
    ).rejects.toMatchObject({
      message: 'workspace_admin_required',
      statusCode: 403,
    });
  });

  test('cannot remove or demote the last owner', async () => {
    const { service } = createService();
    await service.createWorkspace({
      groupId: 'group_a',
      name: 'A',
      ownerUserId: 'owner',
    });

    await expect(
      service.removeMember({
        groupId: 'group_a',
        requesterUserId: 'owner',
        userId: 'owner',
      }),
    ).rejects.toMatchObject({
      message: 'last_owner_required',
      statusCode: 409,
    });
    await expect(
      service.updateMember({
        groupId: 'group_a',
        requesterUserId: 'owner',
        role: 'admin',
        userId: 'owner',
      }),
    ).rejects.toMatchObject({
      message: 'last_owner_required',
      statusCode: 409,
    });
  });

  test('admin cannot remove or change another owner', async () => {
    const { service } = createService();
    await service.createWorkspace({
      groupId: 'group_a',
      name: 'A',
      ownerUserId: 'owner_a',
    });
    await service.addMember({
      groupId: 'group_a',
      requesterUserId: 'owner_a',
      role: 'owner',
      userId: 'owner_b',
    });
    await service.addMember({
      groupId: 'group_a',
      requesterUserId: 'owner_a',
      role: 'admin',
      userId: 'admin',
    });

    await expect(
      service.updateMember({
        groupId: 'group_a',
        requesterUserId: 'admin',
        role: 'member',
        userId: 'owner_b',
      }),
    ).rejects.toMatchObject({
      message: 'workspace_owner_self_required',
      statusCode: 403,
    });
    await expect(
      service.removeMember({
        groupId: 'group_a',
        requesterUserId: 'admin',
        userId: 'owner_b',
      }),
    ).rejects.toMatchObject({
      message: 'workspace_owner_self_required',
      statusCode: 403,
    });
  });

  test('owner can hard delete workspace and related data', async () => {
    const { repository, service } = createService();
    await service.createWorkspace({
      groupId: 'group_a',
      name: 'A',
      ownerUserId: 'owner',
    });
    await service.createInvitation({
      email: 'invitee@example.test',
      groupId: 'group_a',
      requesterUserId: 'owner',
      role: 'member',
    });

    await expect(
      service.deleteWorkspace({
        groupId: 'group_a',
        requesterUserId: 'owner',
      }),
    ).resolves.toEqual(expect.objectContaining({ deletedAt: expect.any(String) }));
    await expect(service.listWorkspacesForUser('owner')).resolves.toEqual([]);
    expect(repository.workspaces).toEqual([]);
    expect(repository.memberships).toEqual([]);
    expect(repository.invitations).toEqual([]);
  });

  test('non-owner cannot delete workspace', async () => {
    const { service } = createService();
    await service.createWorkspace({
      groupId: 'group_a',
      name: 'A',
      ownerUserId: 'owner',
    });
    await service.addMember({
      groupId: 'group_a',
      requesterUserId: 'owner',
      role: 'admin',
      userId: 'admin',
    });

    await expect(
      service.deleteWorkspace({
        groupId: 'group_a',
        requesterUserId: 'admin',
      }),
    ).rejects.toMatchObject({
      message: 'workspace_owner_required',
      statusCode: 403,
    });
  });

  test('user can leave workspace when another owner remains', async () => {
    const { service } = createService();
    await service.createWorkspace({
      groupId: 'group_a',
      name: 'A',
      ownerUserId: 'owner_a',
    });
    await service.addMember({
      groupId: 'group_a',
      requesterUserId: 'owner_a',
      role: 'owner',
      userId: 'owner_b',
    });

    await expect(
      service.leaveWorkspace({
        groupId: 'group_a',
        userId: 'owner_a',
      }),
    ).resolves.toEqual(expect.objectContaining({ status: 'removed' }));
  });

  test('owner can invite by normalized email and duplicate active invite is reused', async () => {
    const { emailService, repository, service } = createService();
    await service.createWorkspace({
      groupId: 'group_a',
      name: 'A',
      ownerUserId: 'owner',
    });

    const first = await service.createInvitation({
      email: ' Invitee@Example.TEST ',
      groupId: 'group_a',
      requesterUserId: 'owner',
      role: 'admin',
    });
    const second = await service.createInvitation({
      email: 'invitee@example.test',
      groupId: 'group_a',
      requesterUserId: 'owner',
      role: 'viewer',
    });

    expect(first).toEqual(
      expect.objectContaining({
        email: 'invitee@example.test',
        role: 'admin',
        status: 'invited',
      }),
    );
    expect(second.invitationId).toBe(first.invitationId);
    expect(repository.invitations).toHaveLength(1);
    expect(repository.invitations[0].inviteTokenHash).toBeTruthy();
    expect(repository.invitations[0].inviteTokenHash).not.toContain(
      'isabake://',
    );
    expect(first).not.toHaveProperty('inviteTokenHash');
    expect(first).not.toHaveProperty('devInviteLink');
    expect(first.emailDelivery).toEqual({
      provider: 'mock',
      sent: false,
      status: 'skipped',
    });
    expect(JSON.stringify(first)).not.toContain('isabake://invite/');
    expect(emailService.sendWorkspaceInvitationEmail).toHaveBeenCalledTimes(2);
  });

  test('owner invitation list hides invitations after they are accepted', async () => {
    const { service } = createService();
    await service.createWorkspace({
      groupId: 'group_a',
      name: 'A',
      ownerUserId: 'owner',
    });
    const accepted = await service.createInvitation({
      email: 'accepted@example.test',
      groupId: 'group_a',
      requesterUserId: 'owner',
      role: 'member',
    });
    const pending = await service.createInvitation({
      email: 'pending@example.test',
      groupId: 'group_a',
      requesterUserId: 'owner',
      role: 'viewer',
    });

    await service.acceptInvitation({
      email: 'accepted@example.test',
      invitationId: accepted.invitationId,
      userId: 'accepted_user',
    });

    await expect(
      service.listWorkspaceInvitations({
        groupId: 'group_a',
        requesterUserId: 'owner',
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        email: 'pending@example.test',
        invitationId: pending.invitationId,
        status: 'invited',
      }),
    ]);
  });

  test('development NODE_ENV alone does not expose devInviteLink', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.EXPOSE_DEV_INVITE_LINKS;
    const { service } = createService();
    await service.createWorkspace({
      groupId: 'group_a',
      name: 'A',
      ownerUserId: 'owner',
    });

    const invitation = await service.createInvitation({
      email: 'invitee@example.test',
      groupId: 'group_a',
      requesterUserId: 'owner',
    });

    expect(invitation).not.toHaveProperty('devInviteLink');
    expect(invitation).not.toHaveProperty('inviteTokenHash');
    expect(invitation.emailDelivery).toEqual(
      expect.objectContaining({ provider: 'mock', status: 'skipped' }),
    );
  });

  test('explicit EXPOSE_DEV_INVITE_LINKS flag returns devInviteLink without token hash', async () => {
    process.env.EXPOSE_DEV_INVITE_LINKS = 'true';
    const { service } = createService();
    await service.createWorkspace({
      groupId: 'group_a',
      name: 'A',
      ownerUserId: 'owner',
    });

    const invitation = await service.createInvitation({
      email: 'invitee@example.test',
      groupId: 'group_a',
      requesterUserId: 'owner',
    });

    expect(invitation.devInviteLink).toContain('isabake://invite/');
    expect(invitation).not.toHaveProperty('inviteTokenHash');
    expect(invitation.emailDelivery).toEqual(
      expect.objectContaining({ provider: 'mock', status: 'skipped' }),
    );
  });

  test('preview by token returns safe data and token hash lookup works', async () => {
    const { emailService, repository, service } = createService();
    await service.upsertDevUser({
      displayName: 'Owner',
      email: 'owner@example.test',
      userId: 'owner',
    });
    await service.createWorkspace({
      groupId: 'group_a',
      name: 'A',
      ownerUserId: 'owner',
    });
    const invitation = await service.createInvitation({
      email: 'invitee@example.test',
      groupId: 'group_a',
      requesterUserId: 'owner',
    });
    const token = getInviteTokenFromEmail(emailService);

    await expect(service.getInvitationPreviewByToken(token)).resolves.toEqual(
      expect.objectContaining({
        email: 'invitee@example.test',
        role: 'member',
        status: 'invited',
        workspace: expect.objectContaining({ name: 'A' }),
      }),
    );
    expect(await repository.findInvitationByTokenHash(hashInviteToken(token))).toEqual(
      expect.objectContaining({ invitationId: invitation.invitationId }),
    );
    expect(JSON.stringify(await service.getInvitationPreviewByToken(token))).not.toContain(
      'inviteTokenHash',
    );
  });

  test('token accept requires matching email and activates membership', async () => {
    const { emailService, repository, service } = createService();
    await service.upsertDevUser({
      displayName: 'Duenia',
      email: 'owner@example.test',
      userId: 'owner',
    });
    await service.createWorkspace({
      groupId: 'group_a',
      name: 'Panaderia Norte',
      ownerUserId: 'owner',
    });
    const invitation = await service.createInvitation({
      email: 'invitee@example.test',
      groupId: 'group_a',
      requesterUserId: 'owner',
      role: 'viewer',
    });
    const token = getInviteTokenFromEmail(emailService);

    await expect(
      service.listMyInvitations({
        email: 'invitee@example.test',
        userId: 'invitee',
      }),
    ).resolves.toEqual([
      expect.objectContaining({
        invitedBy: {
          displayName: 'Duenia',
          email: 'owner@example.test',
        },
        invitationId: invitation.invitationId,
        workspace: {
          groupId: 'group_a',
          name: 'Panaderia Norte',
        },
      }),
    ]);
    await expect(
      service.acceptInvitationByToken({
        email: 'wrong@example.test',
        token,
        userId: 'invitee',
      }),
    ).rejects.toMatchObject({ message: 'invitation_email_mismatch' });
    await expect(
      service.acceptInvitationByToken({
        email: 'invitee@example.test',
        token,
        userId: 'invitee',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        inviteAcceptedFromTokenAt: expect.any(String),
        status: 'accepted',
      }),
    );
    expect(repository.memberships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          groupId: 'group_a',
          role: 'viewer',
          status: 'active',
          userId: 'invitee',
        }),
      ]),
    );
    await expect(
      service.listMyInvitations({
        email: 'invitee@example.test',
        userId: 'invitee',
      }),
    ).resolves.toEqual([]);
  });

  test('regenerate invitation link replaces token and keeps raw link default-deny', async () => {
    const { emailService, repository, service } = createService();
    await service.createWorkspace({
      groupId: 'group_a',
      name: 'A',
      ownerUserId: 'owner',
    });
    await service.addMember({
      groupId: 'group_a',
      requesterUserId: 'owner',
      role: 'member',
      userId: 'member',
    });
    const invitation = await service.createInvitation({
      email: 'invitee@example.test',
      groupId: 'group_a',
      requesterUserId: 'owner',
    });
    const firstToken = getInviteTokenFromEmail(emailService);

    await expect(
      service.regenerateInvitationLink({
        groupId: 'group_a',
        invitationId: invitation.invitationId,
        requesterUserId: 'member',
      }),
    ).rejects.toMatchObject({ message: 'workspace_admin_required' });

    const regenerated = await service.regenerateInvitationLink({
      groupId: 'group_a',
      invitationId: invitation.invitationId,
      requesterUserId: 'owner',
    });
    const secondToken = getInviteTokenFromEmail(emailService);

    expect(secondToken).toBeTruthy();
    expect(secondToken).not.toBe(firstToken);
    expect(regenerated).not.toHaveProperty('devInviteLink');
    expect(regenerated).not.toHaveProperty('inviteTokenHash');
    expect(regenerated.emailDelivery).toEqual(
      expect.objectContaining({ provider: 'mock', status: 'skipped' }),
    );
    expect(repository.invitations[0].inviteTokenHash).toBe(
      hashInviteToken(secondToken),
    );
    await expect(service.getInvitationPreviewByToken(firstToken)).rejects.toMatchObject({
      message: 'invitation_not_found',
    });
    await expect(service.getInvitationPreviewByToken(secondToken)).resolves.toEqual(
      expect.objectContaining({
        email: 'invitee@example.test',
        status: 'invited',
      }),
    );
  });

  test('decline by token works and expired token fails safely', async () => {
    const { emailService, repository, service } = createService();
    await service.createWorkspace({
      groupId: 'group_a',
      name: 'A',
      ownerUserId: 'owner',
    });
    const declined = await service.createInvitation({
      email: 'decline@example.test',
      groupId: 'group_a',
      requesterUserId: 'owner',
    });
    const declinedToken = getInviteTokenFromEmail(emailService);
    const expired = await service.createInvitation({
      email: 'expired@example.test',
      expiresAt: '2000-01-01T00:00:00.000Z',
      groupId: 'group_a',
      requesterUserId: 'owner',
    });
    const expiredToken = getInviteTokenFromEmail(emailService);

    await expect(
      service.declineInvitationByToken({
        email: 'decline@example.test',
        token: declinedToken,
        userId: 'decline',
      }),
    ).resolves.toEqual(expect.objectContaining({ status: 'declined' }));
    await expect(
      service.getInvitationPreviewByToken(expiredToken),
    ).rejects.toMatchObject({ message: 'invitation_expired' });
    expect(
      repository.memberships.some((membership) => membership.userId === 'decline'),
    ).toBe(false);
  });

  test('member cannot invite and owner role is downgraded to member', async () => {
    const { service } = createService();
    await service.createWorkspace({
      groupId: 'group_a',
      name: 'A',
      ownerUserId: 'owner',
    });
    await service.addMember({
      groupId: 'group_a',
      requesterUserId: 'owner',
      role: 'member',
      userId: 'member',
    });

    await expect(
      service.createInvitation({
        email: 'denied@example.test',
        groupId: 'group_a',
        requesterUserId: 'member',
      }),
    ).rejects.toMatchObject({
      message: 'workspace_admin_required',
      statusCode: 403,
    });
    await expect(
      service.createInvitation({
        email: 'owner-role@example.test',
        groupId: 'group_a',
        requesterUserId: 'owner',
        role: 'owner',
      }),
    ).resolves.toEqual(expect.objectContaining({ role: 'member' }));
  });

  test('invited user can accept invitation and membership becomes active', async () => {
    const { repository, service } = createService();
    await service.createWorkspace({
      groupId: 'group_a',
      name: 'A',
      ownerUserId: 'owner',
    });
    const invitation = await service.createInvitation({
      email: 'invitee@example.test',
      groupId: 'group_a',
      requesterUserId: 'owner',
      role: 'viewer',
    });

    await expect(
      service.listMyInvitations({
        email: 'invitee@example.test',
        userId: 'invitee',
      }),
    ).resolves.toHaveLength(1);
    await expect(
      service.acceptInvitation({
        email: 'invitee@example.test',
        invitationId: invitation.invitationId,
        userId: 'invitee',
      }),
    ).resolves.toEqual(expect.objectContaining({ status: 'accepted' }));
    expect(repository.memberships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          groupId: 'group_a',
          role: 'viewer',
          status: 'active',
          userId: 'invitee',
        }),
      ]),
    );
  });

  test('decline and revoked invitation cannot activate membership', async () => {
    const { repository, service } = createService();
    await service.createWorkspace({
      groupId: 'group_a',
      name: 'A',
      ownerUserId: 'owner',
    });
    const declined = await service.createInvitation({
      email: 'decline@example.test',
      groupId: 'group_a',
      requesterUserId: 'owner',
    });
    const revoked = await service.createInvitation({
      email: 'revoked@example.test',
      groupId: 'group_a',
      requesterUserId: 'owner',
    });

    await expect(
      service.declineInvitation({
        email: 'decline@example.test',
        invitationId: declined.invitationId,
        userId: 'decline',
      }),
    ).resolves.toEqual(expect.objectContaining({ status: 'declined' }));
    await expect(
      service.revokeInvitation({
        groupId: 'group_a',
        invitationId: revoked.invitationId,
        requesterUserId: 'owner',
      }),
    ).resolves.toEqual(expect.objectContaining({ status: 'revoked' }));
    await expect(
      service.acceptInvitation({
        email: 'revoked@example.test',
        invitationId: revoked.invitationId,
        userId: 'revoked',
      }),
    ).rejects.toMatchObject({
      message: 'invitation_not_active',
      statusCode: 409,
    });
    expect(
      repository.memberships.some((membership) =>
        ['decline', 'revoked'].includes(membership.userId),
      ),
    ).toBe(false);
  });
});
