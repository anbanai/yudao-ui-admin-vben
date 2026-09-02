import fs from 'node:fs';
import path from 'node:path';
import type { Component } from 'vue';

import ts from 'typescript';
import { createApp, defineComponent, h, nextTick } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { scanSource } from '../../../../../scripts/vsh/src/check-web-antd-contracts/scanner';

import AgeRangeField from '#/views/hrm/recruit/post/modules/age-range-field.vue';
import SalaryRangeField from '#/views/hrm/recruit/post/modules/salary-range-field.vue';

vi.mock('ant-design-vue', () => ({
  Checkbox: defineComponent({
    emits: ['update:checked'],
    setup(_props, { emit }) {
      return () =>
        h('div', [
          h('button', {
            'data-check': 'true',
            onClick: () => emit('update:checked', true),
          }),
          h('button', {
            'data-check': 'false',
            onClick: () => emit('update:checked', false),
          }),
        ]);
    },
  }),
  InputNumber: defineComponent({
    emits: ['update:value'],
    props: { placeholder: String },
    setup(props, { emit }) {
      return () =>
        h('div', [
          h('button', {
            'data-input': `${props.placeholder}:empty`,
            onClick: () => emit('update:value', ''),
          }),
          h('button', {
            'data-input': `${props.placeholder}:42`,
            onClick: () => emit('update:value', '42'),
          }),
        ]);
    },
  }),
  Select: defineComponent({
    emits: ['update:value'],
    setup(_props, { emit }) {
      return () =>
        h('button', {
          'data-select': 'month',
          onClick: () => emit('update:value', 1),
        });
    },
  }),
}));
vi.mock('@vben/hooks', () => ({
  getDictOptions: () => [],
}));

function files(root: string): string[] {
  return fs.readdirSync(root, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(root, e.name);
    if (e.isDirectory()) return files(p);
    return /\.(ts|vue)$/.test(e.name) ? [p] : [];
  });
}
function name(n: ts.ObjectLiteralElementLike) {
  return n.name && (ts.isIdentifier(n.name) || ts.isStringLiteral(n.name))
    ? n.name.text
    : undefined;
}
function problems(file: string): string[] {
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
  const out = scanSource(raw, path.relative(process.cwd(), file))
    .filter((x) => ['VF001', 'VF003'].includes(x.ruleId))
    .map((x) => `${x.ruleId}:${x.line}`);
  function visit(node: ts.Node) {
    if (
      ts.isPropertyAssignment(node) &&
      name(node) === 'dependencies' &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      const props = node.initializer.properties;
      const trigger = props.find((p) => name(p) === 'triggerFields');
      const resolver = props.find((p) => name(p) === 'resolve');
      const line =
        source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
      const location = `${path.relative(process.cwd(), file)}:${line}`;
      const unsupported = props.filter(
        (property) =>
          !['resolve', 'triggerFields'].includes(name(property) ?? ''),
      );
      if (unsupported.length > 0) out.push(`${location}:unsupported`);
      if (!resolver || !trigger) out.push(`${location}:legacy`);
      if (
        resolver &&
        trigger &&
        ts.isPropertyAssignment(trigger) &&
        ts.isArrayLiteralExpression(trigger.initializer)
      ) {
        const declared = trigger.initializer.elements
          .filter(ts.isStringLiteral)
          .map((item) => item.text)
          .toSorted();
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
            ts.isVariableDeclaration(current) &&
            ts.isObjectBindingPattern(current.name) &&
            current.initializer &&
            ts.isIdentifier(current.initializer) &&
            current.initializer.text === 'values'
          ) {
            for (const element of current.name.elements) {
              const field = element.propertyName ?? element.name;
              if (ts.isIdentifier(field)) read.add(field.text);
            }
          }
          ts.forEachChild(current, collect);
        }
        collect(resolver);
        const actual = [...read].toSorted();
        if (
          declared.length === 0 ||
          declared.some((field) => !field) ||
          declared.join(',') !== actual.join(',')
        ) {
          out.push(
            `${location}:declared=${declared.join(',')}:read=${actual.join(',')}`,
          );
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  return out;
}
describe('task 5 wave-three dependency migration', () => {
  const apps: Array<ReturnType<typeof createApp>> = [];

  afterEach(() => {
    apps.splice(0).forEach((app) => app.unmount());
    document.body.innerHTML = '';
  });

  it('uses atomic resolvers with exact triggers across erp/fms/hrm', () => {
    const root = path.resolve(import.meta.dirname, '..');
    const parityOut = ['erp', 'fms', 'hrm'].flatMap((d) =>
      files(path.join(root, d)).flatMap((file) => problems(file)),
    );
    const scannerOut = ['iot', 'wms'].flatMap((d) =>
      files(path.join(root, d)).flatMap((file) =>
        scanSource(
          fs.readFileSync(file, 'utf8'),
          path.relative(process.cwd(), file),
        )
          .filter((violation) => ['VF001', 'VF003'].includes(violation.ruleId))
          .map((violation) => `${violation.ruleId}:${violation.line}`),
      ),
    );
    expect(parityOut).toEqual([]);
    expect(scannerOut).toEqual([]);
  });

  async function mountField(
    component: Component,
    formApi: {
      setFieldValue: (field: string, value: unknown) => Promise<void>;
    },
  ) {
    const host = document.createElement('div');
    document.body.append(host);
    const modelUpdates: unknown[] = [];
    const app = createApp({
      render: () =>
        h(component, {
          formApi,
          values: {},
          'onUpdate:modelValue': (value: unknown) => modelUpdates.push(value),
        }),
    });
    apps.push(app);
    app.config.errorHandler = () => {};
    app.mount(host);
    await nextTick();
    return { host, modelUpdates };
  }

  async function settle() {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await nextTick();
  }

  it('keeps salary component event writes ordered and recovers after failure', async () => {
    const writes: Array<[string, unknown]> = [];
    let attempt = 0;
    const { host, modelUpdates } = await mountField(SalaryRangeField, {
      async setFieldValue(field, value) {
        const currentAttempt = ++attempt;
        await Promise.resolve();
        if (currentAttempt === 2) throw new Error('write failed');
        writes.push([field, value]);
      },
    });
    host
      .querySelector<HTMLButtonElement>('[data-input="最高薪资:empty"]')
      ?.click();
    host
      .querySelector<HTMLButtonElement>('[data-input="最高薪资:42"]')
      ?.click();
    host.querySelector<HTMLButtonElement>('[data-select="month"]')?.click();
    host.querySelector<HTMLButtonElement>('[data-check="true"]')?.click();
    host.querySelector<HTMLButtonElement>('[data-check="false"]')?.click();
    await settle();
    expect(writes).toEqual([
      ['maxSalary', undefined],
      ['salaryUnit', 1],
      ['salaryNegotiable', true],
      ['maxSalary', undefined],
      ['salaryNegotiable', false],
    ]);
    expect(modelUpdates).toEqual([undefined]);
  });

  it('keeps repeated age component events ordered after a rejected write', async () => {
    const writes: Array<[string, unknown]> = [];
    let attempt = 0;
    const { host, modelUpdates } = await mountField(AgeRangeField, {
      async setFieldValue(field, value) {
        const currentAttempt = ++attempt;
        await Promise.resolve();
        if (currentAttempt === 1) throw new Error('write failed');
        writes.push([field, value]);
      },
    });
    host
      .querySelector<HTMLButtonElement>('[data-input="最大年龄:42"]')
      ?.click();
    host
      .querySelector<HTMLButtonElement>('[data-input="最大年龄:42"]')
      ?.click();
    host.querySelector<HTMLButtonElement>('[data-check="true"]')?.click();
    host.querySelector<HTMLButtonElement>('[data-check="false"]')?.click();
    await settle();
    expect(writes).toEqual([
      ['maxAge', 42],
      ['ageUnlimited', true],
      ['maxAge', undefined],
      ['ageUnlimited', false],
    ]);
    expect(modelUpdates).toEqual([undefined]);
  });
});
