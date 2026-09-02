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
});
