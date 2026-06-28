const { WorkspaceService } = require('../../services/workspaceService');
const MemoryWorkspaceRepository = require('./memoryWorkspaceRepository');

const createService = () => {
  const repository = new MemoryWorkspaceRepository();
  return {
    repository,
    service: new WorkspaceService(repository),
  };
};

describe('WorkspaceService', () => {
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
});
