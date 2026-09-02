import type { CAC } from 'cac';

import { scanWorkspace } from './scanner';

const MAX_DIAGNOSTIC_WRITE_BYTES = 60 * 1024;
const ELIDED_DETAIL_MARKER = '[oversized detail elided]';

function sliceUtf8(value: string, maxBytes: number, fromEnd = false): string {
  const characters = [...value];
  const selected: string[] = [];
  let bytes = 0;

  for (
    let index = fromEnd ? characters.length - 1 : 0;
    fromEnd ? index >= 0 : index < characters.length;
    index += fromEnd ? -1 : 1
  ) {
    const character = characters[index]!;
    const characterBytes = Buffer.byteLength(character);
    if (bytes + characterBytes > maxBytes) break;
    selected.push(character);
    bytes += characterBytes;
  }

  return (fromEnd ? selected.toReversed() : selected).join('');
}

function elideOversizedDetail(message: string, maxBytes: number): string {
  const marker = ` ${ELIDED_DETAIL_MARKER} `;
  const contentBytes = Math.max(0, maxBytes - Buffer.byteLength(marker));
  const leadingBytes = Math.floor(contentBytes / 2);
  const trailingBytes = contentBytes - leadingBytes;
  return `${sliceUtf8(message, leadingBytes)}${marker}${sliceUtf8(message, trailingBytes, true)}`;
}

function formatViolation({
  column,
  line,
  message,
  path,
  ruleId,
}: Awaited<ReturnType<typeof scanWorkspace>>[number]): string {
  const prefix = `${path}:${line}:${column} ${ruleId} `;
  const formatted = `${prefix}${message}`;
  if (Buffer.byteLength(formatted) <= MAX_DIAGNOSTIC_WRITE_BYTES) {
    return formatted;
  }
  return `${prefix}${elideOversizedDetail(
    message,
    MAX_DIAGNOSTIC_WRITE_BYTES - Buffer.byteLength(prefix),
  )}`;
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
