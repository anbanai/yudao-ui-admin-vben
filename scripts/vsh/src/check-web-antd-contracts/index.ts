import type { CAC } from 'cac';

import { scanWorkspace } from './scanner';

function formatViolation({
  column,
  line,
  message,
  path,
  ruleId,
}: Awaited<ReturnType<typeof scanWorkspace>>[number]): string {
  return `${path}:${line}:${column} ${ruleId} ${message}`;
}

async function checkWebAntdContracts(paths: string[] = []): Promise<void> {
  const violations = await scanWorkspace(process.cwd(), paths);
  if (violations.length === 0) {
    console.log('Web Antd contracts: no violations found.');
    return;
  }
  console.error(
    violations.map((violation) => formatViolation(violation)).join('\n'),
  );
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
