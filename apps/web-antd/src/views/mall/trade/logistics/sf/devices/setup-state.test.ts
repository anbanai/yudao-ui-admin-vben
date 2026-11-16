import { describe, expect, it } from 'vitest';

import {
  getDeviceSetupState,
  isEnrollmentExpired,
  isReadyPrintDevice,
  selectReadyPrintDeviceId,
} from './setup-state';

describe('getDeviceSetupState', () => {
  it('guides the user through enrollment without exposing protocol fields', () => {
    expect(getDeviceSetupState([]).key).toBe('not-configured');
    expect(getDeviceSetupState([{ pending: true, status: 0 }]).key).toBe(
      'waiting-connection',
    );
    expect(
      getDeviceSetupState([
        {
          lastPollTime: '2026-09-03T01:00:00',
          pending: false,
          printerName: undefined,
          status: 0,
        },
      ]).key,
    ).toBe('printer-required');
    expect(
      getDeviceSetupState([
        { pending: false, printerName: 'Deli GS050DY', status: 0 },
      ]).key,
    ).toBe('ready');
  });

  it('ignores disabled devices when calculating readiness', () => {
    expect(
      getDeviceSetupState([
        { pending: false, printerName: 'Deli GS050DY', status: 1 },
      ]).key,
    ).toBe('not-configured');
  });

  it('only routes orders to connected devices with a selected printer', () => {
    expect(isReadyPrintDevice({ pending: true, status: 0 })).toBe(false);
    expect(isReadyPrintDevice({ pending: false, status: 0 })).toBe(false);
    expect(
      isReadyPrintDevice({
        pending: false,
        printerName: 'Deli GS050DY',
        status: 0,
      }),
    ).toBe(true);
    expect(
      isReadyPrintDevice({
        pending: false,
        printerName: 'Deli GS050DY',
        status: 1,
      }),
    ).toBe(false);
  });

  it('allows a lost enrollment file to be regenerated after expiry', () => {
    expect(
      isEnrollmentExpired(
        { enrollmentExpiresTime: '2026-09-03T01:10:00', pending: true },
        new Date('2026-09-03T01:10:01').getTime(),
      ),
    ).toBe(true);
    expect(
      isEnrollmentExpired(
        { enrollmentExpiresTime: '2026-09-03T01:10:00', pending: true },
        new Date('2026-09-03T01:09:59').getTime(),
      ),
    ).toBe(false);
  });

  it('selects only ready devices and clears a stale selection', () => {
    const devices = [
      { id: 1, defaultFlag: true, pending: true, status: 0 },
      {
        id: 2,
        defaultFlag: false,
        pending: false,
        printerName: 'Deli GS050DY',
        status: 0,
      },
    ];

    expect(selectReadyPrintDeviceId(devices, 1)).toBe(2);
    expect(selectReadyPrintDeviceId(devices, 2)).toBe(2);
    expect(selectReadyPrintDeviceId([devices[0]!], 1)).toBeUndefined();
  });
});
