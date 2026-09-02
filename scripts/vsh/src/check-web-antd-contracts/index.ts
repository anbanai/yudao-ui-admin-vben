import type { CAC } from 'cac';

import { scanWorkspace } from './scanner';

const MAX_DIAGNOSTIC_WRITE_BYTES = 60 * 1024;

function formatViolation({
  column,
  line,
  message,
  path,
  ruleId,
}: Awaited<ReturnType<typeof scanWorkspace>>[number]): string {
  return `${path}:${line}:${column} ${ruleId} ${message}`;
}

function writeViolations(
  violations: Awaited<ReturnType<typeof scanWorkspace>>,
): void {
  let chunk = '';
  for (const violation of violations) {
    const line = formatViolation(violation);
    const nextChunk = chunk ? `${chunk}\n${line}` : line;
    if (chunk && Buffer.byteLength(nextChunk) > MAX_DIAGNOSTIC_WRITE_BYTES) {
      console.error(chunk);
      chunk = line;
    } else {
      chunk = nextChunk;
    }
  }
  if (chunk) console.error(chunk);
}

async function checkWebAntdContracts(paths: string[] = []): Promise<void> {
  const violations = await scanWorkspace(process.cwd(), paths);
  if (violations.length === 0) {
    console.log('Web Antd contracts: no violations found.');
    return;
  }
  writeViolations(violations);
  throw new Error(
    `Web Antd contract check failed with ${violations.length} violation(s).`,
  );
}

function defineCheckWebAntdContractsCommand(cac: CAC): void {
  cac
    .command(
      'check-web-antd-contracts [...paths]',
      'Check Web Antd form and theme migration contracts',
    )
    .action(async (paths: string[]) => checkWebAntdContracts(paths));
}

export { checkWebAntdContracts, defineCheckWebAntdContractsCommand };
