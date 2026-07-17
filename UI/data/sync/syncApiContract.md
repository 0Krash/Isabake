# Isabake Sync API Contract

Phase 14 treats the backend as a sync server only. SQLite remains the
mobile app source of truth, and local writes must never depend on these
endpoints being available.

Sync endpoints require authentication and active workspace membership. Phase 14
uses temporary dev auth headers:

```http
Authorization: Bearer dev-token-owner
x-dev-user-id: owner
x-dev-user-email: owner@example.test
```

Anonymous sync must be rejected.

## Required Endpoints

### `POST /sync/push`

Publishes local `sync_outbox` events for one shared workspace.

Request:

```json
{
  "groupId": "group_123",
  "deviceId": "device_abc",
  "events": [
    {
      "eventId": "outbox_1",
      "collection": "recipes",
      "documentId": "recipe_local_1",
      "operation": "create",
      "document": {},
      "localVersion": 3,
      "baseServerVersion": 2,
      "createdAt": "2026-06-26T00:00:00.000Z"
    }
  ]
}
```

Response:

```json
{
  "accepted": [
    {
      "eventId": "outbox_1",
      "collection": "recipes",
      "localId": "recipe_local_1",
      "remoteId": "remote_recipe_1",
      "serverVersion": 3,
      "syncedAt": "2026-06-26T00:00:01.000Z"
    }
  ],
  "rejected": [
    {
      "eventId": "outbox_2",
      "reason": "conflict",
      "conflictDocument": {},
      "currentServerVersion": 4,
      "attemptedBaseServerVersion": 2
    }
  ],
  "cursor": "cursor_after_push"
}
```

Server rules:

- Store documents scoped by `groupId`.
- Reject writes where the authenticated user is not an active owner, admin, or
  member of `groupId`.
- Detect conflicts when `baseServerVersion` does not match the current server
  document version.
- Conflict rejections must include `conflictDocument`, `currentServerVersion`,
  and `attemptedBaseServerVersion`.
- Return `remoteId`, `serverVersion`, and `syncedAt` only after the server has
  durably stored the accepted change.
- Treat deletes as soft deletes using `deletedAt`.

### `GET /sync/pull?groupId=...&cursor=...`

Returns all changes for a shared workspace since the client's last cursor.

Response:

```json
{
  "groupId": "group_123",
  "changes": [
    {
      "collection": "recipes",
      "remoteId": "remote_recipe_1",
      "document": {},
      "serverVersion": 3,
      "operation": "update",
      "updatedAt": "2026-06-26T00:00:01.000Z",
      "deletedAt": null
    }
  ],
  "cursor": "cursor_after_pull"
}
```

Server rules:

- Only return documents in `groupId`.
- Only return data when the authenticated user is an active owner, admin,
  member, or viewer of `groupId`.
- Include soft-deleted documents so other devices can apply deletes.
- Cursor ordering must be stable and resumable.
- The endpoint should be idempotent for the same cursor.

## Workspace Endpoints

### `POST /workspaces`

Creates a workspace and makes the authenticated user the owner.

### `GET /workspaces`

Lists workspaces where the authenticated user has active membership.

### `GET /workspaces/:groupId`

Returns a workspace only if the authenticated user has active membership.

### `GET /workspaces/:groupId/members`

Returns members for owner/admin users.

### `POST /workspaces/:groupId/members`

Adds or updates a member. Owner/admin only.

Valid roles: `owner`, `admin`, `member`, `viewer`.
Valid statuses: `active`, `invited`, `removed`.

## Later, Not Phase 14

- `POST /sync/ack` can be added later if pull acknowledgements are needed.
- WebSocket notifications can be added after push/pull are reliable.
- Production auth, invitation email, token refresh, membership UI, and conflict
  resolution UI are not part of Phase 14.
