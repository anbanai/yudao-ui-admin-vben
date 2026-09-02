export type SfPaperSpecValue = '76x130' | '100x150';

export interface SfPaperSpec {
  dpi: 203;
  heightMm: 130 | 150;
  label: string;
  value: SfPaperSpecValue;
  widthMm: 76 | 100;
}

export const SF_PAPER_SPEC_OPTIONS: SfPaperSpec[] = [
  {
    dpi: 203,
    heightMm: 130,
    label: '丰密76130标准模板 76×130 mm',
    value: '76x130',
    widthMm: 76,
  },
  {
    dpi: 203,
    heightMm: 150,
    label: '丰密150标准模板 100×150 mm',
    value: '100x150',
    widthMm: 100,
  },
];

export const DEFAULT_SF_PAPER_SPEC = SF_PAPER_SPEC_OPTIONS[0]!;

export function getSfPaperSpec(value: SfPaperSpecValue) {
  return (
    SF_PAPER_SPEC_OPTIONS.find((spec) => spec.value === value) ??
    DEFAULT_SF_PAPER_SPEC
  );
}

export function toSfPaperSpecValue(
  widthMm: number,
  heightMm: number,
): SfPaperSpecValue | undefined {
  return SF_PAPER_SPEC_OPTIONS.find(
    (spec) => spec.widthMm === widthMm && spec.heightMm === heightMm,
  )?.value;
}
