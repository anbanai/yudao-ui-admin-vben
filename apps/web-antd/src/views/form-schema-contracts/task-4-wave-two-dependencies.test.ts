import fs from 'node:fs';
import path from 'node:path';

import ts from 'typescript';
import { createPinia, setActivePinia } from 'pinia';
import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('#/api/mall/trade/delivery/pickUpStore', () => ({
  getSimpleDeliveryPickUpStoreList: vi.fn().mockResolvedValue([]),
}));

import {
  calculateNewPayPrice,
  usePriceFormSchema,
} from '#/views/mall/trade/order/data';

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
      if (legacy.length > 0 || (trigger && !resolver)) {
        problems.push(`${location} legacy dependency callbacks`);
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

  it('writes derived order prices only at the rapid user-change boundary', async () => {
    const writes: string[] = [];
    const schema = usePriceFormSchema(async (adjustPrice) => {
      writes.push(calculateNewPayPrice('10.00', adjustPrice));
    });
    const props = schema.find(({ fieldName }) => fieldName === 'adjustPrice')
      ?.componentProps as { onChange?: (value: number) => Promise<void> };
    expect(writes).toEqual([]);
    await Promise.all([
      props.onChange?.(1),
      props.onChange?.(-2),
      props.onChange?.(3),
    ]);
    expect(writes).toEqual(['11.00', '8.00', '13.00']);
  });
});
