import type { ThemeException } from './scanner';

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { applyThemeExceptions, scanSource, scanWorkspace } from './scanner';

const tempDirs: string[] = [];

function ruleIds(source: string, file = 'src/example.ts') {
  return scanSource(source, file).map(({ ruleId }) => ruleId);
}

describe('web-antd contract scanner', () => {
  afterEach(async () => {
    await Promise.all(
      tempDirs
        .splice(0)
        .map((path) => rm(path, { force: true, recursive: true })),
    );
  });

  it('rejects legacy and mixed dependency callbacks', () => {
    const source = `
      const schema = [{
        fieldName: 'detail',
        component: 'Input',
        dependencies: {
          triggerFields: ['mode'],
          show: (values) => values.mode === 1,
        },
      }, {
        fieldName: 'missingResolver',
        component: 'Input',
        dependencies: { triggerFields: ['mode'] },
      }, {
        fieldName: 'mixed',
        component: 'Input',
        dependencies: {
          triggerFields: ['mode'],
          resolve: ({ values }) => ({ show: values.mode === 1 }),
          disabled: false,
        },
      }];
    `;

    expect(ruleIds(source).filter((ruleId) => ruleId === 'VF001')).toHaveLength(
      2,
    );
    expect(ruleIds(source)).toContain('VF002');
  });

  it('rejects empty triggers and resolver form writes', () => {
    const source = `
      const schema = [{
        fieldName: 'name',
        component: 'Input',
        dependencies: {
          triggerFields: [''],
          resolve: ({ controller }) => {
            controller.setFieldValue('name', 'loop');
            return { show: true };
          },
        },
      }];
    `;

    expect(ruleIds(source)).toEqual(expect.arrayContaining(['VF003', 'VF004']));
  });

  it('rejects empty trigger field arrays', () => {
    const source = `
      const schema = [{
        fieldName: 'name',
        component: 'Input',
        dependencies: { triggerFields: [] },
      }];
    `;

    expect(ruleIds(source)).toEqual(expect.arrayContaining(['VF001', 'VF003']));
  });

  it('distinguishes schema valueFormat from component valueFormat', () => {
    const source = `
      const schema = [{
        fieldName: 'range',
        component: 'RangePicker',
        componentProps: { valueFormat: 'x' },
        valueFormat: (value) => value,
      }];
    `;

    expect(ruleIds(source).filter((ruleId) => ruleId === 'VF005')).toHaveLength(
      1,
    );
  });

  it('rejects deprecated form methods, options, callbacks, and Zod APIs', () => {
    const source = `
      formApi.resetForm();
      useVbenForm({
        fieldMappingTime: [],
        schema: [{
          fieldName: 'id',
          component: 'Input',
          componentProps: (values, formApi) => ({ disabled: !!values.id }),
          rules: z.string().ip(),
        }],
      });
    `;

    expect(ruleIds(source)).toEqual(
      expect.arrayContaining(['VF006', 'VF007', 'VF008', 'ZOD001']),
    );
  });

  it('rejects a legacy single-parameter values callback', () => {
    const source = `
      const schema = [{
        fieldName: 'id',
        component: 'Input',
        componentProps: (values) => ({ disabled: !!values.id }),
      }];
    `;

    expect(ruleIds(source)).toContain('VF008');
  });

  it('parses Vue slots, classes, and style blocks structurally', () => {
    const source = `
      <script setup lang="ts">
      const color = '#ffffff';
      </script>
      <template>
        <template #name="{ model, field }">
          <input v-bind="slotProps" class="bg-white text-gray-500" />
        </template>
      </template>
      <style scoped lang="scss">
      .panel {
        // Intentional SCSS line comment.
        background: #fff;
        color: var(--foreground);
      }
      </style>
    `;

    expect(ruleIds(source, 'src/example.vue')).toEqual(
      expect.arrayContaining(['VF009', 'VF010', 'TH001', 'TH002']),
    );
  });

  it('accepts field slots that do not bind the removed model value', () => {
    const source = `
      <template>
        <template #name="{ field, componentProps }">
          <input v-bind="componentProps" />
        </template>
      </template>
    `;

    expect(ruleIds(source, 'src/example.vue')).not.toContain('VF009');
  });

  it('parses standalone CSS and SCSS declarations structurally', () => {
    expect(ruleIds('.panel { color: #fff; }', 'src/example.css')).toEqual([
      'TH002',
    ]);
    expect(
      ruleIds(
        '$brand: #1677ff;\n.panel { border-color: $brand; }',
        'src/example.scss',
      ),
    ).toEqual(['TH002']);
  });

  it('accepts resolve-only dependencies and semantic theme tokens', () => {
    const source = `
      const schema = [{
        fieldName: 'name',
        component: 'Input',
        dependencies: {
          triggerFields: ['mode'],
          resolve: ({ values }) => ({ show: values.mode === 1 }),
        },
      }];
      const classes = 'bg-card text-foreground border-border';
    `;

    expect(ruleIds(source)).toEqual([]);
  });

  it('only scans script strings in color declarations', () => {
    const source = `
      const helpText = 'Use #108ee9 in legacy documentation.';
      const color = '#ffffff';
      const theme = { backgroundColor: '#1677ff' };
    `;

    expect(ruleIds(source)).toEqual(['TH002', 'TH002']);
  });

  it('preserves nested CSS color function literals for exception matching', () => {
    const violations = scanSource(
      `const color = 'hsl(var(--primary))';`,
      'src/theme.ts',
    );

    expect(violations).toContainEqual(
      expect.objectContaining({ literal: 'hsl(var(--primary))' }),
    );
  });

  it('scans dynamic template class and style expressions', () => {
    const source = `
      <template>
        <div :class="isOpen ? 'bg-white' : 'bg-card'" :style="{ color: '#fff' }" />
      </template>
    `;

    expect(ruleIds(source, 'src/example.vue')).toEqual(
      expect.arrayContaining(['TH001', 'TH002']),
    );
  });

  it('matches reviewed colors and reports stale exceptions', () => {
    const violations = scanSource(`const color = '#1677ff';`, 'src/status.ts');
    const reviewed: ThemeException = {
      category: 'status',
      literal: '#1677ff',
      occurrence: 1,
      path: 'src/status.ts',
      reason: 'Represents the persisted enabled status color.',
      source: "const color = '#1677ff';",
    };

    expect(applyThemeExceptions(violations, [reviewed])).toEqual([]);
    expect(
      applyThemeExceptions([], [reviewed]).map(({ ruleId }) => ruleId),
    ).toEqual(['TH999']);
  });

  it('scans a workspace and applies its reviewed theme exceptions', async () => {
    const root = await mkdtemp(join(tmpdir(), 'web-antd-contracts-'));
    tempDirs.push(root);
    const appRoot = join(root, 'apps/web-antd');
    const sourceRoot = join(appRoot, 'src');
    await mkdir(sourceRoot, { recursive: true });
    await writeFile(
      join(sourceRoot, 'status.ts'),
      `const statusColor = '#1677ff';\n`,
      'utf8',
    );
    await writeFile(
      join(appRoot, 'theme-color-exceptions.json'),
      JSON.stringify([
        {
          category: 'status',
          literal: '#1677ff',
          occurrence: 1,
          path: 'src/status.ts',
          reason: 'Represents persisted enabled status.',
          source: "const statusColor = '#1677ff';",
        },
      ]),
      'utf8',
    );

    await expect(scanWorkspace(root)).resolves.toEqual([]);
  });

  it('rejects malformed theme exceptions before stale exception matching', async () => {
    const root = await mkdtemp(join(tmpdir(), 'web-antd-contracts-'));
    tempDirs.push(root);
    const appRoot = join(root, 'apps/web-antd');
    await mkdir(join(appRoot, 'src'), { recursive: true });
    await writeFile(
      join(appRoot, 'theme-color-exceptions.json'),
      JSON.stringify([
        {
          category: 'unsupported',
          literal: '#1677ff',
          occurrence: 0,
          path: '',
          reason: '',
          source: '',
        },
      ]),
      'utf8',
    );

    await expect(scanWorkspace(root)).resolves.toEqual([
      expect.objectContaining({ ruleId: 'TH998' }),
    ]);
  });
});
