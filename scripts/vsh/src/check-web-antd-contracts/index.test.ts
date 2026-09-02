import type { ContractViolation } from './scanner';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { checkWebAntdContracts } from './index';

const { scanWorkspace } = vi.hoisted(() => ({
  scanWorkspace: vi.fn(),
}));

vi.mock('./scanner', () => ({ scanWorkspace }));

function createViolations(count: number): ContractViolation[] {
  return Array.from({ length: count }, (_, index) => ({
    column: 1,
    line: index + 1,
    message: 'Replace this legacy dependency callback with dependencies.resolve.',
    path: `src/${'migration-'.repeat(12)}${index}.ts`,
    ruleId: 'VF001',
  }));
}

describe('checkWebAntdContracts', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetAllMocks();
  });

  it('streams a large report as complete diagnostics below the write boundary', async () => {
    const violations = createViolations(1000);
    scanWorkspace.mockResolvedValue(violations);
    const write = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(checkWebAntdContracts()).rejects.toThrow(
      '1000 violation(s)',
    );

    const writes = write.mock.calls.map(([chunk]) => String(chunk));
    const diagnostics = writes.flatMap((chunk) => chunk.split('\n'));
    const expected = violations.map(
      ({ column, line, message, path, ruleId }) =>
        `${path}:${line}:${column} ${ruleId} ${message}`,
    );

    expect(writes.length).toBeGreaterThan(1);
    expect(writes.every((chunk) => Buffer.byteLength(chunk) < 65_536)).toBe(
      true,
    );
    expect(diagnostics).toEqual(expected);
  });

  it('elides an oversized diagnostic detail without splitting or dropping violations', async () => {
    const repairGuidance =
      'Replace this legacy dependency callback with dependencies.resolve.';
    const violations: ContractViolation[] = [
      ...createViolations(1),
      {
        column: 27,
        line: 42,
        message: `Invalid literal ${'x'.repeat(70_000)}. ${repairGuidance}`,
        path: 'src/oversized-detail.ts',
        ruleId: 'VF001',
      },
      {
        ...createViolations(1)[0]!,
        line: 43,
        path: 'src/after-oversized-detail.ts',
      },
    ];
    scanWorkspace.mockResolvedValue(violations);
    const write = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(checkWebAntdContracts()).rejects.toThrow('3 violation(s)');

    const writes = write.mock.calls.map(([chunk]) => `${String(chunk)}\n`);
    const diagnostics = writes.flatMap((chunk) =>
      chunk.slice(0, -1).split('\n'),
    );

    expect(writes.every((chunk) => Buffer.byteLength(chunk) < 65_536)).toBe(
      true,
    );
    expect(writes.every((chunk) => chunk.endsWith('\n'))).toBe(true);
    expect(diagnostics).toHaveLength(3);
    expect(diagnostics[0]?.startsWith('src/migration-')).toBe(true);
    expect(
      diagnostics[1]?.startsWith(
        'src/oversized-detail.ts:42:27 VF001 Invalid literal ',
      ),
    ).toBe(true);
    expect(diagnostics[1]).toContain('[oversized detail elided]');
    expect(diagnostics[1]?.endsWith(repairGuidance)).toBe(true);
    expect(diagnostics[2]).toBe(
      `src/after-oversized-detail.ts:43:1 VF001 ${repairGuidance}`,
    );
  });
});
