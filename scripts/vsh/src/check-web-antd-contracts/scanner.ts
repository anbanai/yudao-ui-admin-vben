import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

import { parse as parseSfc } from '@vue/compiler-sfc';

import postcss from 'postcss';
import postcssScss from 'postcss-scss';
import ts from 'typescript';

const LEGACY_DEPENDENCY_KEYS = new Set([
  'componentProps',
  'disabled',
  'if',
  'required',
  'rules',
  'show',
  'trigger',
]);
const RESOLVER_WRITE_METHODS = new Set([
  'clearValidation',
  'reset',
  'resetForm',
  'setFieldError',
  'setFieldValue',
  'setValues',
  'submit',
  'submitForm',
  'validate',
  'validateAndSubmit',
  'validateAndSubmitForm',
]);
const FORM_API_CONTEXT_KEYS = new Set(['controller', 'formApi']);
const DEPRECATED_FORM_METHODS = new Set([
  'resetForm',
  'resetValidate',
  'submitForm',
  'validateAndSubmitForm',
]);
const DEPRECATED_FORM_OPTIONS = new Set([
  'arrayToStringFields',
  'disabledOnChangeListener',
  'disabledOnInputListener',
  'fieldMappingTime',
  'validateOnBlur',
  'validateOnChange',
  'validateOnInput',
  'validateOnModelUpdate',
]);
const THEME_CATEGORIES = new Set([
  'brand',
  'chart',
  'design-preview',
  'print',
  'status',
]);
const RAW_COLOR_PATTERN = /#[\da-f]{3,8}\b|\b(?:hsl|hsla|rgb|rgba)\s*\(/gi;
const NEUTRAL_CLASS_PATTERN =
  /(?:^|\s)(?:(?:[\w-]+):)*(?:bg|border|divide|from|outline|placeholder|ring|text|to|via)-(?:black|gray|neutral|slate|stone|white|zinc)(?:-\d{2,3})?(?:\/\d{1,3})?(?=\s|$)/g;

export type ThemeExceptionCategory =
  | 'brand'
  | 'chart'
  | 'design-preview'
  | 'print'
  | 'status';

export interface ThemeException {
  category: ThemeExceptionCategory;
  literal: string;
  occurrence: number;
  path: string;
  reason: string;
  source: string;
}

export interface ContractViolation {
  column: number;
  line: number;
  literal?: string;
  message: string;
  occurrence?: number;
  path: string;
  ruleId: string;
  source?: string;
}

interface ScanContext {
  lineOffset: number;
  path: string;
  source: string;
  violations: ContractViolation[];
}

function normalizeSourceLine(value: string): string {
  return value.trim().replaceAll(/\s+/g, ' ');
}

function getSourceLine(source: string, line: number): string {
  return normalizeSourceLine(source.split(/\r?\n/)[line - 1] ?? '');
}

function addViolation(
  context: ScanContext,
  ruleId: string,
  message: string,
  line: number,
  column: number,
  literal?: string,
) {
  const absoluteLine = line + context.lineOffset;
  context.violations.push({
    column,
    line: absoluteLine,
    ...(literal ? { literal } : {}),
    message,
    path: context.path,
    ruleId,
    source: getSourceLine(context.source, absoluteLine),
  });
}

function getPropertyName(
  node: ts.ObjectLiteralElementLike,
): string | undefined {
  const name = node.name;
  if (!name) return undefined;
  if (ts.isIdentifier(name) || ts.isStringLiteral(name)) return name.text;
  return undefined;
}

function getProperty(
  object: ts.ObjectLiteralExpression,
  propertyName: string,
): ts.ObjectLiteralElementLike | undefined {
  return object.properties.find(
    (property) => getPropertyName(property) === propertyName,
  );
}

function getFunctionLike(
  property: ts.ObjectLiteralElementLike,
): ts.ArrowFunction | ts.FunctionExpression | ts.MethodDeclaration | undefined {
  if (ts.isMethodDeclaration(property)) return property;
  if (
    ts.isPropertyAssignment(property) &&
    (ts.isArrowFunction(property.initializer) ||
      ts.isFunctionExpression(property.initializer))
  ) {
    return property.initializer;
  }
  return undefined;
}

function nodeLocation(sourceFile: ts.SourceFile, node: ts.Node) {
  const location = sourceFile.getLineAndCharacterOfPosition(
    node.getStart(sourceFile),
  );
  return { column: location.character + 1, line: location.line + 1 };
}

function scanThemeLiteral(
  value: string,
  context: ScanContext,
  line: number,
  column: number,
) {
  for (const match of value.matchAll(NEUTRAL_CLASS_PATTERN)) {
    const literal = match[0]!.trim();
    addViolation(
      context,
      'TH001',
      `Use a semantic theme token instead of \`${literal}\`.`,
      line,
      column + (match.index ?? 0),
      literal,
    );
  }
  for (const match of value.matchAll(RAW_COLOR_PATTERN)) {
    const literal = match[0]!.endsWith('(')
      ? getColorFunctionLiteral(value, match.index ?? 0)
      : match[0]!;
    if (isSemanticColorFunctionLiteral(literal)) continue;
    addViolation(
      context,
      'TH002',
      `Use a semantic theme token or register the intentional color \`${literal}\`.`,
      line,
      column + (match.index ?? 0),
      literal,
    );
  }
}

function isSemanticColorFunctionLiteral(value: string): boolean {
  return /^(?:hsl|hsla|rgb|rgba)\(\s*var\(\s*--[\w-]+\s*\)(?:\s*\/[^)]*)?\s*\)$/i.test(
    value,
  );
}

function getColorFunctionLiteral(value: string, start: number): string {
  const openingParenthesis = value.indexOf('(', start);
  let depth = 0;
  for (let index = openingParenthesis; index < value.length; index++) {
    if (value[index] === '(') depth++;
    if (value[index] === ')') {
      depth--;
      if (depth === 0) return value.slice(start, index + 1);
    }
  }
  return value.slice(start);
}

function scanTypeScript(
  code: string,
  context: ScanContext,
  scriptKind: ts.ScriptKind,
  scanAllThemeStrings = false,
) {
  const sourceFile = ts.createSourceFile(
    context.path,
    code,
    ts.ScriptTarget.Latest,
    true,
    scriptKind,
  );

  function reportNode(
    node: ts.Node,
    ruleId: string,
    message: string,
    literal?: string,
  ) {
    const location = nodeLocation(sourceFile, node);
    addViolation(
      context,
      ruleId,
      message,
      location.line,
      location.column,
      literal,
    );
  }

  function scanDependencies(
    object: ts.ObjectLiteralExpression,
    property: ts.ObjectLiteralElementLike,
  ) {
    const legacyProperties = object.properties.filter((item) =>
      LEGACY_DEPENDENCY_KEYS.has(getPropertyName(item) ?? ''),
    );
    const resolveProperty = getProperty(object, 'resolve');
    const triggerFieldsProperty = getProperty(object, 'triggerFields');
    if (legacyProperties.length > 0 && resolveProperty) {
      reportNode(
        property,
        'VF002',
        '`dependencies.resolve` cannot be mixed with legacy callbacks.',
      );
    } else if (
      legacyProperties.length > 0 ||
      (triggerFieldsProperty && !resolveProperty)
    ) {
      reportNode(
        property,
        'VF001',
        'Replace legacy dependency callbacks with one `dependencies.resolve`.',
      );
    }

    const triggerFields = getPropertyInitializer(triggerFieldsProperty);
    if (
      triggerFields &&
      ts.isArrayLiteralExpression(triggerFields) &&
      (triggerFields.elements.length === 0 ||
        triggerFields.elements.some(
          (element) =>
            ts.isStringLiteral(element) && element.text.trim() === '',
        ))
    ) {
      reportNode(
        triggerFields,
        'VF003',
        '`triggerFields` must contain real field names.',
      );
    }

    if (resolveProperty) {
      const resolver = getFunctionLike(resolveProperty);
      if (resolver?.body) {
        const { aliases, contexts } = getResolverFormApiBindings(resolver);
        const mutationAliases = new Set<string>();

        function inspectResolver(node: ts.Node, isResolverBody = false) {
          if (
            !isResolverBody &&
            (ts.isArrowFunction(node) ||
              ts.isFunctionExpression(node) ||
              ts.isFunctionDeclaration(node) ||
              ts.isMethodDeclaration(node))
          ) {
            return;
          }
          if (
            ts.isVariableDeclaration(node) &&
            ts.isIdentifier(node.name) &&
            isFormApiReceiver(node.initializer, aliases, contexts)
          ) {
            aliases.add(node.name.text);
          }
          if (
            ts.isVariableDeclaration(node) &&
            ts.isObjectBindingPattern(node.name) &&
            isFormApiReceiver(node.initializer, aliases, contexts)
          ) {
            for (const element of node.name.elements) {
              const methodName = getBindingElementPropertyName(element);
              if (
                methodName &&
                RESOLVER_WRITE_METHODS.has(methodName) &&
                ts.isIdentifier(element.name)
              ) {
                mutationAliases.add(element.name.text);
              }
            }
          }
          if (
            ts.isCallExpression(node) &&
            isResolverMutationCall(node, aliases, contexts, mutationAliases)
          ) {
            reportNode(
              node,
              'VF004',
              '`dependencies.resolve` must be pure and cannot call form mutation methods.',
            );
          }
          ts.forEachChild(node, inspectResolver);
        }
        inspectResolver(resolver.body, true);
      }
    }
  }

  function visit(node: ts.Node) {
    if (
      (ts.isStringLiteralLike(node) ||
        ts.isNoSubstitutionTemplateLiteral(node)) &&
      (scanAllThemeStrings || isScriptColorLiteral(node))
    ) {
      const location = nodeLocation(sourceFile, node);
      scanThemeLiteral(node.text, context, location.line, location.column + 1);
    }

    if (
      ts.isPropertyAssignment(node) &&
      getPropertyName(node) === 'dependencies' &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      scanDependencies(node.initializer, node);
    }

    if (
      (ts.isPropertyAssignment(node) || ts.isMethodDeclaration(node)) &&
      DEPRECATED_FORM_OPTIONS.has(getPropertyName(node) ?? '')
    ) {
      reportNode(node, 'VF007', 'Replace the deprecated Vben Form option.');
    }

    if (
      ts.isPropertyAssignment(node) &&
      getPropertyName(node) === 'valueFormat' &&
      ts.isObjectLiteralExpression(node.parent) &&
      (getProperty(node.parent, 'fieldName') ||
        getProperty(node.parent, 'component'))
    ) {
      reportNode(
        node,
        'VF005',
        'Replace schema `valueFormat` with a form-level codec.',
      );
    }

    if (
      (ts.isPropertyAssignment(node) || ts.isMethodDeclaration(node)) &&
      getPropertyName(node) === 'componentProps' &&
      ts.isObjectLiteralExpression(node.parent) &&
      getProperty(node.parent, 'fieldName')
    ) {
      const callback = getFunctionLike(node);
      const firstParameter = callback?.parameters[0];
      const usesLegacyValuesParameter =
        firstParameter &&
        ts.isIdentifier(firstParameter.name) &&
        firstParameter.name.text === 'values';
      if (
        callback &&
        (callback.parameters.length > 1 || usesLegacyValuesParameter)
      ) {
        reportNode(
          node,
          'VF008',
          'Top-level `componentProps` receives one FormSchemaContext; move value dependencies to `dependencies.resolve`.',
        );
      }
    }

    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression)
    ) {
      const method = node.expression.name.text;
      if (DEPRECATED_FORM_METHODS.has(method)) {
        reportNode(
          node,
          'VF006',
          `Replace deprecated form method \`${method}\`.`,
        );
      }
      if (method === 'ip') {
        reportNode(
          node,
          'ZOD001',
          'Replace removed `z.string().ip()` with a Zod 4-compatible validator.',
        );
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

function getBindingElementPropertyName(
  element: ts.BindingElement,
): string | undefined {
  if (element.propertyName && ts.isIdentifier(element.propertyName)) {
    return element.propertyName.text;
  }
  return ts.isIdentifier(element.name) ? element.name.text : undefined;
}

function isResolverMutationCall(
  node: ts.CallExpression,
  aliases: Set<string>,
  contexts: Set<string>,
  mutationAliases: Set<string>,
): boolean {
  if (ts.isIdentifier(node.expression)) {
    return mutationAliases.has(node.expression.text);
  }
  return (
    ts.isPropertyAccessExpression(node.expression) &&
    RESOLVER_WRITE_METHODS.has(node.expression.name.text) &&
    isFormApiReceiver(node.expression.expression, aliases, contexts)
  );
}

function getResolverFormApiBindings(
  resolver: ts.ArrowFunction | ts.FunctionExpression | ts.MethodDeclaration,
) {
  const aliases = new Set<string>();
  const contexts = new Set<string>();
  for (const parameter of resolver.parameters) {
    if (ts.isIdentifier(parameter.name)) {
      contexts.add(parameter.name.text);
      continue;
    }
    if (!ts.isObjectBindingPattern(parameter.name)) continue;
    for (const element of parameter.name.elements) {
      let contextKey: string | undefined;
      if (element.propertyName && ts.isIdentifier(element.propertyName)) {
        contextKey = element.propertyName.text;
      } else if (ts.isIdentifier(element.name)) {
        contextKey = element.name.text;
      }
      if (
        contextKey &&
        FORM_API_CONTEXT_KEYS.has(contextKey) &&
        ts.isIdentifier(element.name)
      ) {
        aliases.add(element.name.text);
      }
    }
  }
  return { aliases, contexts };
}

function isFormApiReceiver(
  node: ts.Node | undefined,
  aliases: Set<string>,
  contexts: Set<string>,
): boolean {
  if (node && ts.isIdentifier(node)) return aliases.has(node.text);
  return (
    !!node &&
    ts.isPropertyAccessExpression(node) &&
    ts.isIdentifier(node.expression) &&
    contexts.has(node.expression.text) &&
    FORM_API_CONTEXT_KEYS.has(node.name.text)
  );
}

function isScriptColorLiteral(node: ts.StringLiteralLike): boolean {
  const parent = node.parent;
  if (ts.isPropertyAssignment(parent)) {
    const propertyName = getPropertyName(parent) ?? '';
    return (
      propertyName.toLowerCase().includes('color') ||
      /^(?:background|border|boxShadow|fill|outline|stroke)$/i.test(
        propertyName,
      )
    );
  }
  if (ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)) {
    return (
      parent.name.text.toLowerCase().includes('color') ||
      /^(?:background|border|boxShadow|fill|outline|stroke)$/i.test(
        parent.name.text,
      )
    );
  }
  return false;
}

function getPropertyInitializer(
  property: ts.ObjectLiteralElementLike | undefined,
): ts.Expression | undefined {
  return property && ts.isPropertyAssignment(property)
    ? property.initializer
    : undefined;
}

function getDirectiveExpression(prop: any): string | undefined {
  return prop?.exp?.type === 4 ? prop.exp.content : undefined;
}

function slotExposesModel(expression: string): boolean {
  const sourceFile = ts.createSourceFile(
    'slot.ts',
    `const ${expression} = slotProps;`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const declaration = sourceFile.statements[0];
  if (!declaration || !ts.isVariableStatement(declaration)) return false;
  const bindingName = declaration.declarationList.declarations[0]?.name;
  return (
    !!bindingName &&
    ts.isObjectBindingPattern(bindingName) &&
    bindingName.elements.some(
      (element) =>
        (ts.isIdentifier(element.name) && element.name.text === 'model') ||
        (element.propertyName &&
          ts.isIdentifier(element.propertyName) &&
          element.propertyName.text === 'model'),
    )
  );
}

function scanTemplateNode(node: any, context: ScanContext) {
  if (node?.type === 1) {
    for (const prop of node.props ?? []) {
      const line = prop.loc?.start?.line ?? 1;
      const column = prop.loc?.start?.column ?? 1;
      if (prop.type === 6 && prop.name === 'class' && prop.value) {
        scanThemeLiteral(prop.value.content, context, line, column);
      }
      if (prop.type === 6 && prop.name === 'style' && prop.value) {
        scanThemeLiteral(prop.value.content, context, line, column);
      }
      if (prop.type !== 7) continue;
      const expression = getDirectiveExpression(prop);
      if (
        prop.name === 'bind' &&
        (prop.arg?.content === 'class' || prop.arg?.content === 'style') &&
        expression
      ) {
        scanTemplateExpression(expression, prop, context);
      }
      if (prop.name === 'bind' && !prop.arg && expression === 'slotProps') {
        addViolation(
          context,
          'VF010',
          'Bind field controls with `slotProps.componentProps`.',
          line,
          column,
        );
      }
      if (prop.name === 'slot' && expression && slotExposesModel(expression)) {
        addViolation(
          context,
          'VF009',
          'The field slot no longer exposes a `model` binding.',
          line,
          column,
        );
      }
    }
  }
  for (const child of node?.children ?? []) scanTemplateNode(child, context);
  if (node?.branches) {
    for (const branch of node.branches) scanTemplateNode(branch, context);
  }
}

function scanTemplateExpression(
  expression: string,
  prop: any,
  context: ScanContext,
) {
  const sourceFile = ts.createSourceFile(
    context.path,
    `(${expression})`,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const expressionStart = prop.exp.loc.start;

  function visit(node: ts.Node) {
    if (
      ts.isStringLiteralLike(node) ||
      ts.isNoSubstitutionTemplateLiteral(node)
    ) {
      const relativeStart = node.getStart(sourceFile) - 1;
      const beforeLiteral = expression.slice(0, relativeStart);
      const lineBreak = beforeLiteral.lastIndexOf('\n');
      const line = expressionStart.line + beforeLiteral.split('\n').length - 1;
      const column =
        lineBreak === -1
          ? expressionStart.column + relativeStart + 1
          : relativeStart - lineBreak + 1;
      scanThemeLiteral(node.text, context, line, column);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
}

function scanStyle(code: string, context: ScanContext, isScss: boolean) {
  const root = isScss
    ? postcssScss.parse(code, { from: context.path })
    : postcss.parse(code, { from: context.path });
  root.walkDecls((declaration) => {
    if (
      !/(?:background|border|box-shadow|color|fill|outline|stroke)/i.test(
        declaration.prop,
      ) &&
      !declaration.prop.startsWith('$') &&
      !declaration.prop.startsWith('--')
    ) {
      return;
    }
    const start = declaration.source?.start;
    scanThemeLiteral(
      declaration.value,
      context,
      start?.line ?? 1,
      (start?.column ?? 1) +
        declaration.prop.length +
        (declaration.raw('between') || ':').length,
    );
  });
}

function assignOccurrences(violations: ContractViolation[]) {
  const occurrences = new Map<string, number>();
  for (const violation of violations) {
    if (!violation.ruleId.startsWith('TH') || !violation.literal) continue;
    const key = [violation.path, violation.literal, violation.source].join(
      '\0',
    );
    const occurrence = (occurrences.get(key) ?? 0) + 1;
    occurrences.set(key, occurrence);
    violation.occurrence = occurrence;
  }
  return violations;
}

function getBlockLineOffset(source: string, blockStartOffset: number): number {
  return source.slice(0, blockStartOffset).split(/\r?\n/).length - 1;
}

export function scanSource(source: string, path: string): ContractViolation[] {
  const violations: ContractViolation[] = [];
  const baseContext: ScanContext = {
    lineOffset: 0,
    path,
    source,
    violations,
  };

  if (path.endsWith('.css') || path.endsWith('.scss')) {
    scanStyle(source, baseContext, path.endsWith('.scss'));
    return assignOccurrences(violations);
  }

  if (!path.endsWith('.vue')) {
    scanTypeScript(
      source,
      baseContext,
      path.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    return assignOccurrences(violations);
  }

  const { descriptor, errors } = parseSfc(source, { filename: path });
  if (errors.length > 0) {
    violations.push({
      column: 1,
      line: 1,
      message: `Unable to parse Vue SFC: ${String(errors[0])}`,
      path,
      ruleId: 'PARSE001',
    });
    return violations;
  }
  for (const script of [descriptor.script, descriptor.scriptSetup]) {
    if (!script) continue;
    scanTypeScript(
      script.content,
      {
        ...baseContext,
        lineOffset: getBlockLineOffset(source, script.loc.start.offset),
      },
      script.lang === 'tsx' ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
  }
  if (descriptor.template?.ast) {
    scanTemplateNode(descriptor.template.ast, baseContext);
  }
  for (const style of descriptor.styles) {
    scanStyle(
      style.content,
      {
        ...baseContext,
        lineOffset: getBlockLineOffset(source, style.loc.start.offset),
      },
      style.lang === 'scss',
    );
  }
  return assignOccurrences(violations);
}

export function applyThemeExceptions(
  violations: ContractViolation[],
  exceptions: ThemeException[],
): ContractViolation[] {
  const matched = new Set<number>();
  const remaining = violations.filter((violation) => {
    if (!violation.ruleId.startsWith('TH')) return true;
    const index = exceptions.findIndex(
      (exception, candidateIndex) =>
        !matched.has(candidateIndex) &&
        exception.path === violation.path &&
        exception.literal === violation.literal &&
        exception.occurrence === violation.occurrence &&
        exception.source === violation.source,
    );
    if (index === -1) return true;
    matched.add(index);
    return false;
  });

  exceptions.forEach((exception, index) => {
    if (matched.has(index)) return;
    remaining.push({
      column: 1,
      line: 1,
      message: `Theme exception is stale or malformed: ${exception.reason}`,
      path: exception.path,
      ruleId: 'TH999',
    });
    if (!THEME_CATEGORIES.has(exception.category)) {
      remaining.at(-1)!.message =
        `Unknown theme exception category: ${exception.category}`;
    }
  });
  return remaining;
}

const SCANNED_EXTENSIONS = new Set(['.css', '.scss', '.ts', '.tsx', '.vue']);

async function collectFiles(path: string): Promise<string[]> {
  const entries = await readdir(path, { withFileTypes: true });
  const files = await Promise.all(
    entries
      .filter(
        (entry) => !entry.name.startsWith('.') && entry.name !== 'node_modules',
      )
      .map(async (entry) => {
        const entryPath = join(path, entry.name);
        if (entry.isDirectory()) return collectFiles(entryPath);
        return SCANNED_EXTENSIONS.has(extname(entry.name)) ? [entryPath] : [];
      }),
  );
  return files.flat();
}

function isThemeException(value: unknown): value is ThemeException {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.category === 'string' &&
    THEME_CATEGORIES.has(candidate.category) &&
    typeof candidate.literal === 'string' &&
    candidate.literal.length > 0 &&
    typeof candidate.occurrence === 'number' &&
    Number.isInteger(candidate.occurrence) &&
    candidate.occurrence > 0 &&
    typeof candidate.path === 'string' &&
    candidate.path.length > 0 &&
    typeof candidate.reason === 'string' &&
    candidate.reason.trim().length > 0 &&
    typeof candidate.source === 'string' &&
    candidate.source.trim().length > 0
  );
}

export async function scanWorkspace(
  workspaceRoot: string,
  requestedPaths: string[] = [],
): Promise<ContractViolation[]> {
  const appRoot = resolve(workspaceRoot, 'apps/web-antd');
  const roots =
    requestedPaths.length > 0
      ? requestedPaths.map((path) => resolve(workspaceRoot, path))
      : [join(appRoot, 'src')];
  const collectedFiles = await Promise.all(
    roots.map((root) => collectFiles(root)),
  );
  const files = collectedFiles.flat().toSorted();
  const violations: ContractViolation[] = [];
  for (const file of files) {
    const path = relative(appRoot, file).replaceAll('\\', '/');
    violations.push(...scanSource(await readFile(file, 'utf8'), path));
  }

  const exceptionPath = join(appRoot, 'theme-color-exceptions.json');
  let exceptions: ThemeException[] = [];
  try {
    const parsed = JSON.parse(await readFile(exceptionPath, 'utf8')) as unknown;
    if (
      !Array.isArray(parsed) ||
      !parsed.every((entry) => isThemeException(entry))
    ) {
      return [
        ...violations,
        {
          column: 1,
          line: 1,
          message: 'Theme exception file must contain valid reviewed entries.',
          path: 'theme-color-exceptions.json',
          ruleId: 'TH998',
        },
      ];
    }
    exceptions = parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  return applyThemeExceptions(violations, exceptions);
}
