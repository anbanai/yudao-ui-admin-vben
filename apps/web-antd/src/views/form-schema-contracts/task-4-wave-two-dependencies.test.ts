// oxlint-disable unicorn/no-array-callback-reference, unicorn/no-array-sort, unicorn/require-array-join-separator, vitest/prefer-lowercase-title, no-nested-ternary
import fs from 'node:fs';
import path from 'node:path';

import { createPinia, setActivePinia } from 'pinia';
import ts from 'typescript';
import { beforeAll, describe, expect, it, vi } from 'vitest';

import {
  calculateNewPayPrice,
  createOrderPriceChangeHandler,
  usePriceFormSchema,
} from '#/views/mall/trade/order/data';

import { scanSource } from '../../../../../scripts/vsh/src/check-web-antd-contracts/scanner';

vi.mock('#/api/mall/trade/delivery/pickUpStore', () => ({
  getSimpleDeliveryPickUpStoreList: vi.fn().mockResolvedValue([]),
}));

function sourceFiles(root: string): string[] {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(root, entry.name);
    return entry.isDirectory()
      ? sourceFiles(target)
      : /\.(?:ts|vue)$/.test(entry.name)
        ? [target]
        : [];
  });
}

function propertyName(node: ts.ObjectLiteralElementLike) {
  return node.name &&
    (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name))
    ? node.name.text
    : undefined;
}

function dependencyProblems(file: string): string[] {
  const raw = fs.readFileSync(file, 'utf8');
  const script = file.endsWith('.vue')
    ? (raw.match(/<script[^>]*>([\s\S]*?)<\/script>/)?.[1] ?? '')
    : raw;
  const source = ts.createSourceFile(
    file,
    script,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const problems: string[] = [];
  problems.push(
    ...scanSource(raw, path.relative(process.cwd(), file))
      .filter(({ ruleId }) =>
        ['VF001', 'VF002', 'VF003', 'VF004'].includes(ruleId),
      )
      .map(
        ({ column, line, ruleId }) =>
          `${path.relative(process.cwd(), file)}:${line}:${column} ${ruleId}`,
      ),
  );

  function visit(node: ts.Node) {
    if (
      ts.isPropertyAssignment(node) &&
      propertyName(node) === 'dependencies' &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      const properties = node.initializer.properties;
      const line =
        source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      const location = `${path.relative(process.cwd(), file)}:${line}`;
      const trigger = properties.find(
        (item) => propertyName(item) === 'triggerFields',
      );
      const resolver = properties.find(
        (item) => propertyName(item) === 'resolve',
      );
      const legacy = properties.filter((item) =>
        [
          'componentProps',
          'disabled',
          'if',
          'required',
          'rules',
          'show',
        ].includes(propertyName(item) ?? ''),
      );
      const unsupported = properties.filter(
        (item) =>
          !['resolve', 'triggerFields'].includes(propertyName(item) ?? ''),
      );
      if (unsupported.length > 0) {
        problems.push(`${location} unsupported dependency shape`);
      }
      if (legacy.length > 0 || (trigger && !resolver)) {
        problems.push(`${location} legacy dependency callbacks`);
      }
      if (resolver && !trigger) {
        problems.push(`${location} resolver missing trigger fields`);
      }
      if (
        trigger &&
        ts.isPropertyAssignment(trigger) &&
        ts.isArrayLiteralExpression(trigger.initializer) &&
        resolver
      ) {
        const declared = trigger.initializer.elements
          .filter(ts.isStringLiteral)
          .map((item) => item.text)
          .sort();
        const read = new Set<string>();
        function collect(current: ts.Node) {
          if (
            ts.isPropertyAccessExpression(current) &&
            ts.isIdentifier(current.expression) &&
            current.expression.text === 'values'
          ) {
            read.add(current.name.text);
          }
          if (
            ts.isElementAccessExpression(current) &&
            ts.isIdentifier(current.expression) &&
            current.expression.text === 'values' &&
            current.argumentExpression &&
            ts.isStringLiteral(current.argumentExpression)
          ) {
            read.add(current.argumentExpression.text);
          }
          if (
            ts.isVariableDeclaration(current) &&
            ts.isObjectBindingPattern(current.name) &&
            current.initializer &&
            ts.isIdentifier(current.initializer) &&
            current.initializer.text === 'values'
          ) {
            for (const element of current.name.elements) {
              const name = element.propertyName ?? element.name;
              if (ts.isIdentifier(name)) read.add(name.text);
            }
          }
          ts.forEachChild(current, collect);
        }
        collect(resolver);
        const expected = [...read].sort();
        if (
          declared.length === 0 ||
          declared.some((field) => !field) ||
          declared.join() !== expected.join()
        ) {
          problems.push(
            `${location} declared=${declared.join(',')} read=${expected.join(',')}`,
          );
        }
      }
      if (resolver) {
        const functionNode = ts.isMethodDeclaration(resolver)
          ? resolver
          : ts.isPropertyAssignment(resolver) &&
              (ts.isArrowFunction(resolver.initializer) ||
                ts.isFunctionExpression(resolver.initializer))
            ? resolver.initializer
            : undefined;
        if (functionNode?.body) {
          let hasAwait = false;
          const variables = new Map<string, ts.Expression>();
          function inspect(current: ts.Node) {
            if (ts.isAwaitExpression(current)) hasAwait = true;
            if (
              ts.isVariableDeclaration(current) &&
              ts.isIdentifier(current.name) &&
              current.initializer
            ) {
              variables.set(current.name.text, current.initializer);
            }
            ts.forEachChild(current, inspect);
          }
          inspect(functionNode.body);
          const isAsync = functionNode.modifiers?.some(
            ({ kind }) => kind === ts.SyntaxKind.AsyncKeyword,
          );
          if (hasAwait && !isAsync)
            problems.push(`${location} await without async`);
          const expectedOrder = [
            'if',
            'show',
            'componentProps',
            'rules',
            'disabled',
            'required',
          ];
          function inspectResult(expression: ts.Expression) {
            if (ts.isParenthesizedExpression(expression)) {
              inspectResult(expression.expression);
            } else if (ts.isConditionalExpression(expression)) {
              inspectResult(expression.whenTrue);
              inspectResult(expression.whenFalse);
            } else if (ts.isIdentifier(expression)) {
              const initializer = variables.get(expression.text);
              if (initializer) inspectResult(initializer);
            } else if (ts.isObjectLiteralExpression(expression)) {
              const actual = expression.properties
                .map(propertyName)
                .filter((key): key is string => Boolean(key));
              for (const key of actual) {
                if (!expectedOrder.includes(key)) {
                  problems.push(`${location} unsupported result key=${key}`);
                }
              }
              const sorted = [...actual].sort(
                (a, b) => expectedOrder.indexOf(a) - expectedOrder.indexOf(b),
              );
              if (actual.join() !== sorted.join()) {
                problems.push(`${location} result order=${actual.join(',')}`);
              }
            }
          }
          const body = functionNode.body;
          if (ts.isBlock(body)) {
            function inspectReturns(current: ts.Node) {
              if (
                current !== body &&
                (ts.isArrowFunction(current) ||
                  ts.isFunctionExpression(current))
              ) {
                return;
              }
              if (ts.isReturnStatement(current) && current.expression) {
                inspectResult(current.expression);
              }
              ts.forEachChild(current, inspectReturns);
            }
            inspectReturns(body);
          } else {
            inspectResult(body);
          }
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return problems;
}

describe('Task 4 wave-two dependency migration', () => {
  beforeAll(() => setActivePinia(createPinia()));

  it('uses atomic resolvers with exact real trigger fields', () => {
    const views = path.resolve(import.meta.dirname, '..');
    const problems = ['mall', 'pay', 'mp', 'im'].flatMap((directory) =>
      sourceFiles(path.join(views, directory)).flatMap(dependencyProblems),
    );
    expect(problems).toEqual([]);
  });

  it('audits every supported resolver result shape and async contract', () => {
    const root = fs.mkdtempSync(path.join(process.cwd(), '.task-4-audit-'));
    const valid = path.join(root, 'valid.ts');
    const invalid = path.join(root, 'invalid.ts');
    try {
      fs.writeFileSync(
        valid,
        `const schemas = [
          { dependencies: { triggerFields: ['mode'], resolve: ({ values }) => ({ show: values.mode === 1 }) } },
          { dependencies: { triggerFields: ['mode'], resolve({ values }) { if (values.mode === 1) return { show: true }; return { show: false }; } } },
          { dependencies: { triggerFields: ['mode'], resolve({ values }) { const result = { show: values.mode === 1, disabled: false }; return result; } } },
          { dependencies: { triggerFields: ['mode'], async resolve({ values }) { await Promise.resolve(); return { show: values.mode === 1 }; } } },
        ];`,
      );
      fs.writeFileSync(
        invalid,
        `const schemas = [
          { dependencies: { triggerFields: ['mode'], resolve: ({ values }) => ({ visible: values.mode === 1 }) } },
          { dependencies: { triggerFields: ['mode'], resolve({ values }) { const result = { show: values.mode === 1, mystery: true }; return result; } } },
          { dependencies: { triggerFields: ['mode'], resolve({ values }) { await Promise.resolve(); return { show: values.mode === 1 }; } } },
        ];`,
      );
      expect(dependencyProblems(valid)).toEqual([]);
      expect(dependencyProblems(invalid)).toEqual(
        expect.arrayContaining([
          expect.stringContaining('unsupported result key=visible'),
          expect.stringContaining('unsupported result key=mystery'),
          expect.stringContaining('await without async'),
        ]),
      );
    } finally {
      fs.rmSync(root, { force: true, recursive: true });
    }
  });

  it('serializes real async order price reads and writes so the latest event wins', async () => {
    const writes: string[] = [];
    let reads = 0;
    const handler = createOrderPriceChangeHandler({
      async getValues() {
        reads++;
        await Promise.resolve();
        return { payPrice: '10.00' };
      },
      async setFieldValue(_field, value) {
        await Promise.resolve();
        writes.push(value);
      },
    });
    const schema = usePriceFormSchema(handler);
    const props = schema.find(({ fieldName }) => fieldName === 'adjustPrice')
      ?.componentProps as { onChange?: (value: number) => Promise<void> };
    expect(writes).toEqual([]);
    await Promise.all([
      props.onChange?.(1),
      props.onChange?.(-2),
      props.onChange?.(3),
    ]);
    expect(reads).toBe(3);
    expect(writes).toEqual(['11.00', '8.00', '13.00']);
    expect(writes.at(-1)).toBe(calculateNewPayPrice('10.00', 3));
  });

  it('recovers after a rejected order write and handles null and repeated values', async () => {
    const writes: string[] = [];
    let attempts = 0;
    const handler = createOrderPriceChangeHandler({
      async getValues() {
        await Promise.resolve();
        return { payPrice: '10.00' };
      },
      async setFieldValue(_field, value) {
        attempts++;
        if (attempts === 2) throw new Error('price write failed');
        writes.push(value);
      },
    });
    const results = await Promise.allSettled([
      handler(1),
      handler(null),
      handler(null),
      handler(3),
    ]);
    expect(results.map(({ status }) => status)).toEqual([
      'fulfilled',
      'rejected',
      'fulfilled',
      'fulfilled',
    ]);
    expect(attempts).toBe(4);
    expect(writes).toEqual(['11.00', '10.00', '13.00']);
    expect(writes.at(-1)).toBe('13.00');
  });
});
