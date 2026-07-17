const CHECK_STATUS = {
  FAILED: 'failed',
  PASSED: 'passed',
  SKIPPED: 'skipped',
};

const nowIso = () => new Date().toISOString();

const toErrorPayload = (error) => ({
  message: String(error?.message || error),
  name: error?.name || 'Error',
});

const getCheckPassed = (result) => {
  if (typeof result?.ok === 'boolean') {
    return result.ok;
  }

  if (typeof result?.success === 'boolean') {
    return result.success;
  }

  return true;
};

export const runCheckDefinitions = async (
  checkDefinitions,
  options = {},
) => {
  const results = [];

  for (const definition of checkDefinitions) {
    const startedAt = nowIso();

    if (definition.mutatesData && !options.includeMutatingChecks) {
      results.push({
        finishedAt: nowIso(),
        mutatesData: true,
        name: definition.name,
        reason: 'mutating_check_requires_includeMutatingChecks',
        startedAt,
        status: CHECK_STATUS.SKIPPED,
      });
      continue;
    }

    if (definition.runtime === 'expo' && options.skipExpoRuntimeChecks) {
      results.push({
        finishedAt: nowIso(),
        mutatesData: Boolean(definition.mutatesData),
        name: definition.name,
        reason: 'expo_runtime_check_skipped',
        runtime: definition.runtime,
        startedAt,
        status: CHECK_STATUS.SKIPPED,
      });
      continue;
    }

    try {
      const result = await definition.run(options);
      const passed = getCheckPassed(result);

      results.push({
        finishedAt: nowIso(),
        mutatesData: Boolean(definition.mutatesData),
        name: definition.name,
        result,
        runtime: definition.runtime,
        startedAt,
        status: passed ? CHECK_STATUS.PASSED : CHECK_STATUS.FAILED,
      });
    } catch (error) {
      results.push({
        error: toErrorPayload(error),
        finishedAt: nowIso(),
        mutatesData: Boolean(definition.mutatesData),
        name: definition.name,
        runtime: definition.runtime,
        startedAt,
        status: CHECK_STATUS.FAILED,
      });
    }
  }

  const failedCount = results.filter(
    (result) => result.status === CHECK_STATUS.FAILED,
  ).length;
  const passedCount = results.filter(
    (result) => result.status === CHECK_STATUS.PASSED,
  ).length;
  const skippedCount = results.filter(
    (result) => result.status === CHECK_STATUS.SKIPPED,
  ).length;

  return {
    failedCount,
    ok: failedCount === 0,
    passedCount,
    results,
    skippedCount,
    totalCount: results.length,
  };
};

const localCheckDefinitions = [
  {
    mutatesData: false,
    name: 'localOnlyReadiness',
    runtime: 'expo',
    run: async () => {
      const { runLocalOnlyReadinessCheck } = await import(
        '../validation/localOnlyReadinessCheck'
      );

      return runLocalOnlyReadinessCheck();
    },
  },
  {
    mutatesData: false,
    name: 'localTransactionReturnSmoke',
    runtime: 'expo',
    run: async () => {
      const { runLocalTransactionReturnSmokeTest } = await import(
        '../services/localTransactionReturnSmokeTest'
      );

      return runLocalTransactionReturnSmokeTest();
    },
  },
  {
    mutatesData: true,
    name: 'localTransactionRollbackSmoke',
    runtime: 'expo',
    run: async () => {
      const { runLocalTransactionRollbackSmokeTest } = await import(
        '../services/localTransactionRollbackSmokeTest'
      );

      return runLocalTransactionRollbackSmokeTest();
    },
  },
  {
    mutatesData: true,
    name: 'inventoryStockServiceSmoke',
    runtime: 'expo',
    run: async () => {
      const { runInventoryStockServiceSmokeTest } = await import(
        '../services/inventoryStockServiceSmokeTest'
      );

      return runInventoryStockServiceSmokeTest();
    },
  },
  {
    mutatesData: true,
    name: 'recipeSaleServiceSmoke',
    runtime: 'expo',
    run: async () => {
      const { runRecipeSaleServiceSmokeTest } = await import(
        '../services/recipeSaleServiceSmokeTest'
      );

      return runRecipeSaleServiceSmokeTest();
    },
  },
];

const syncCheckDefinitions = [
  {
    mutatesData: false,
    name: 'syncReadiness',
    runtime: 'expo',
    run: async () => {
      const { runSyncReadinessCheck } = await import(
        '../validation/syncReadinessCheck'
      );

      return runSyncReadinessCheck();
    },
  },
  {
    mutatesData: false,
    name: 'syncIntegrity',
    runtime: 'expo',
    run: async (options = {}) => {
      const { checkSyncIntegrity } = await import(
        '../sync/syncIntegrityService'
      );

      return checkSyncIntegrity({
        groupId: options.groupId,
        verifyRemote: Boolean(options.verifyRemote),
      });
    },
  },
  {
    mutatesData: true,
    name: 'businessSyncSanity',
    runtime: 'expo',
    run: async (options = {}) => {
      const { runBusinessSyncSanityCheck } = await import(
        './devSyncSanityCheck'
      );

      return runBusinessSyncSanityCheck(options);
    },
  },
];

const summarizeRun = (kind, startedAt, summary) => ({
  checkedAt: startedAt,
  finishedAt: nowIso(),
  kind,
  ...summary,
});

export const runLocalDevChecks = async (options = {}) => {
  const startedAt = nowIso();
  const definitions = options.localCheckDefinitions || localCheckDefinitions;
  const summary = await runCheckDefinitions(definitions, options);

  return summarizeRun('local', startedAt, summary);
};

export const runSyncDevChecks = async (options = {}) => {
  const startedAt = nowIso();
  const definitions = options.syncCheckDefinitions || syncCheckDefinitions;
  const summary = await runCheckDefinitions(definitions, options);

  return summarizeRun('sync', startedAt, summary);
};

export const runAllDevChecks = async (options = {}) => {
  const startedAt = nowIso();
  const [local, sync] = await Promise.all([
    runLocalDevChecks(options),
    runSyncDevChecks(options),
  ]);
  const failedCount = local.failedCount + sync.failedCount;

  return {
    checkedAt: startedAt,
    failedCount,
    finishedAt: nowIso(),
    kind: 'all',
    local,
    ok: failedCount === 0,
    passedCount: local.passedCount + sync.passedCount,
    skippedCount: local.skippedCount + sync.skippedCount,
    sync,
    totalCount: local.totalCount + sync.totalCount,
  };
};

export const previewDevDataReset = async (options = {}) => {
  const { previewDevDataReset: previewReset } = await import(
    './devDataResetService'
  );

  return previewReset(options);
};

export const runDevDataReset = async (options = {}) => {
  if (!options.confirm) {
    return {
      blocked: true,
      error: 'runDevDataReset requires confirm: true.',
      success: false,
    };
  }

  const { runDevDataReset: runReset } = await import('./devDataResetService');

  return runReset(options);
};

export const runSyncSanityCheck = async (options = {}) => {
  const { runSyncSanityCheck: runCheck } = await import(
    './devSyncSanityCheck'
  );

  return runCheck(options);
};

export const runBusinessSyncSanityCheck = async (options = {}) => {
  const { runBusinessSyncSanityCheck: runCheck } = await import(
    './devSyncSanityCheck'
  );

  return runCheck(options);
};

export const runAutoSyncBusinessWriteCheck = async (options = {}) => {
  const { runAutoSyncBusinessWriteCheck: runCheck } = await import(
    './devSyncSanityCheck'
  );

  return runCheck(options);
};

export const runBusinessWriteAutoSyncCheck = async (options = {}) => {
  const { runBusinessWriteAutoSyncCheck: runCheck } = await import(
    './devSyncSanityCheck'
  );

  return runCheck(options);
};

export const runAutoSyncDecisionTraceCheck = async (options = {}) => {
  const { runAutoSyncDecisionTraceCheck: runCheck } = await import(
    './devSyncSanityCheck'
  );

  return runCheck(options);
};

export const runPostLoginSyncBootstrapCheck = async (options = {}) => {
  const { runPostLoginSyncBootstrapCheck: runCheck } = await import(
    '../sync/postLoginSyncBootstrap'
  );

  return runCheck(options);
};

export const previewSyncRepair = async (options = {}) => {
  const { previewSyncRepair: previewRepair } = await import(
    '../sync/syncIntegrityService'
  );

  return previewRepair(options);
};

export const runSyncRepair = async (options = {}) => {
  const { runSyncRepair: repair } = await import(
    '../sync/syncIntegrityService'
  );

  return repair(options);
};

export default {
  previewSyncRepair,
  previewDevDataReset,
  runAutoSyncBusinessWriteCheck,
  runAutoSyncDecisionTraceCheck,
  runBusinessWriteAutoSyncCheck,
  runBusinessSyncSanityCheck,
  runAllDevChecks,
  runDevDataReset,
  runLocalDevChecks,
  runPostLoginSyncBootstrapCheck,
  runSyncRepair,
  runSyncSanityCheck,
  runSyncDevChecks,
};
