# Dev Testing For Local-First Sync

Phase 11.6 adds isolated dev/test runners so local-first and sync work can be
validated without wiring temporary code into `App.js`.

## Rule

`App.js` must stay clean. Do not paste temporary readiness checks, smoke tests,
reset helpers, or sync runners into startup code.

Use Jest, npm scripts, or the isolated dev helpers in this folder instead.

## Node/Jest Checks

These can be run by Codex or any local shell without Expo runtime:

```sh
npm test -- --runInBand
npm run test:unit
npm run test:local
npm run test:sync
npm run test:dev
npm run check:syntax
npm run check:no-startup-test-wiring
```

Jest tests cover:

- current workspace/current group behavior with mocked storage
- sync readiness result shaping with mocked storage
- sync client safe failure when no backend URL is configured
- sync service safe failure when `groupId` is missing
- outbox count helper result shape with mocked storage
- `runLocalTransaction` return/error propagation with mocked DB
- dev runner result shaping and destructive-check skipping

## Expo Runtime Checks

These checks use Expo SQLite and must run inside an Expo runtime:

- `runLocalOnlyReadinessCheck()`
- `runSyncReadinessCheck()`
- `runLocalTransactionReturnSmokeTest()`
- `runLocalTransactionRollbackSmokeTest()`
- `runInventoryStockServiceSmokeTest()`
- `runRecipeSaleServiceSmokeTest()`
- `previewDevDataReset()`
- `runDevDataReset()`

Import them through the central runner:

```js
import {
  previewDevDataReset,
  runAllDevChecks,
  runDevDataReset,
  runLocalDevChecks,
  runSyncDevChecks,
} from './data/dev/runDevChecks';
```

Recommended Expo dev-console calls:

```js
await runLocalDevChecks();
await runSyncDevChecks();
await runAllDevChecks();
```

By default, mutating smoke tests are skipped. To run smoke tests that create
dev data:

```js
await runAllDevChecks({ includeMutatingChecks: true });
```

## Data Safety

Read-only/safe checks by default:

- local readiness
- sync readiness
- local transaction return smoke

Mutating checks, skipped unless `includeMutatingChecks: true`:

- local transaction rollback smoke
- inventory stock service smoke
- recipe sale service smoke

Reset helpers never run from `runAllDevChecks()`.

Preview smoke/dev cleanup:

```js
await previewDevDataReset();
```

Actually clean smoke/dev data:

```js
await runDevDataReset({ confirm: true });
```

`runDevDataReset()` refuses to run without `confirm: true`.

## Static Startup Guard

Run:

```sh
npm run check:no-startup-test-wiring
```

This fails if `App.js` imports or calls known readiness checks, smoke tests,
reset helpers, or low-level sync runners.
