import {
  runAllDevChecks,
  runCheckDefinitions,
  runDevDataReset,
  runLocalDevChecks,
} from './runDevChecks';

describe('runDevChecks', () => {
  test('continues independent checks and reports passed, failed, and skipped', async () => {
    const result = await runCheckDefinitions([
      {
        name: 'passes',
        run: async () => ({ ok: true }),
      },
      {
        name: 'fails',
        run: async () => ({ ok: false }),
      },
      {
        mutatesData: true,
        name: 'mutating',
        run: async () => ({ ok: true }),
      },
    ]);

    expect(result.ok).toBe(false);
    expect(result.passedCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(result.skippedCount).toBe(1);
    expect(result.results.map((check) => check.status)).toEqual([
      'passed',
      'failed',
      'skipped',
    ]);
  });

  test('local runner accepts injected check definitions for Node/Jest tests', async () => {
    const result = await runLocalDevChecks({
      localCheckDefinitions: [
        {
          name: 'mockLocalReadiness',
          run: async () => ({ ok: true }),
        },
      ],
    });

    expect(result.kind).toBe('local');
    expect(result.ok).toBe(true);
    expect(result.totalCount).toBe(1);
  });

  test('all runner combines injected local and sync summaries', async () => {
    const result = await runAllDevChecks({
      localCheckDefinitions: [
        {
          name: 'local',
          run: async () => ({ ok: true }),
        },
      ],
      syncCheckDefinitions: [
        {
          name: 'sync',
          run: async () => ({ ok: true }),
        },
      ],
    });

    expect(result.kind).toBe('all');
    expect(result.ok).toBe(true);
    expect(result.totalCount).toBe(2);
  });

  test('dev reset wrapper requires explicit confirmation', async () => {
    await expect(runDevDataReset()).resolves.toEqual({
      blocked: true,
      error: 'runDevDataReset requires confirm: true.',
      success: false,
    });
  });
});
