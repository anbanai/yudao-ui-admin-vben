import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SF_PAPER_SPEC,
  getSfPaperSpec,
  SF_PAPER_SPEC_OPTIONS,
  toSfPaperSpecValue,
} from './paper-spec';

describe('sf paper specification', () => {
  it('defaults new accounts to 76x130 at 203 DPI', () => {
    expect(DEFAULT_SF_PAPER_SPEC).toMatchObject({
      dpi: 203,
      heightMm: 130,
      value: '76x130',
      widthMm: 76,
    });
  });

  it('maps both supported selections to exact dimensions', () => {
    expect(SF_PAPER_SPEC_OPTIONS).toHaveLength(2);
    expect(getSfPaperSpec('76x130')).toMatchObject({
      heightMm: 130,
      widthMm: 76,
    });
    expect(getSfPaperSpec('100x150')).toMatchObject({
      heightMm: 150,
      widthMm: 100,
    });
  });

  it('does not turn mixed or unknown dimensions into a supported selection', () => {
    expect(toSfPaperSpecValue(76, 150)).toBeUndefined();
    expect(toSfPaperSpecValue(100, 130)).toBeUndefined();
    expect(toSfPaperSpecValue(100, 150)).toBe('100x150');
  });
});
