import type { HotZoneItemProperty } from '../../config';

import { describe, expect, it } from 'vitest';

import { normalizeHotZones } from './controller';

const createHotZone = (
  values: Partial<HotZoneItemProperty> = {},
): HotZoneItemProperty =>
  ({
    name: '',
    url: '',
    left: 0,
    top: 0,
    width: 100,
    height: 100,
    ...values,
  }) as HotZoneItemProperty;

describe('normalizeHotZones', () => {
  it('keeps every hot zone inside the editor bounds', () => {
    expect(
      normalizeHotZones(
        [createHotZone({ left: 464, top: 198, width: 308, height: 153 })],
        { width: 750, height: 300 },
      ),
    ).toEqual([
      createHotZone({ left: 442, top: 147, width: 308, height: 153 }),
    ]);
  });

  it('does not mutate the source list while normalizing old data', () => {
    const source = [
      createHotZone({ left: 700, top: 280, width: 200, height: 100 }),
    ];

    normalizeHotZones(source, { width: 750, height: 300 });

    expect(source[0]).toEqual(
      createHotZone({ left: 700, top: 280, width: 200, height: 100 }),
    );
  });
});
