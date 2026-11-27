import { describe, expect, it } from 'vitest';

import { createSettingsForm, settingsPayload } from './sf-settings-form';

describe('merchant SF settings', () => {
  it('retains a saved card and offers only available paper templates', () => {
    const form = createSettingsForm({
      monthlyCardMasked: '****1234',
      supportedPaperSpecs: ['100x150'],
      configured: false,
    });
    const payload = settingsPayload(form);
    expect(payload.monthlyCard).toBeUndefined();
    expect(payload.paperWidthMm).toBe(100);
    expect(payload.paperHeightMm).toBe(150);
    expect(payload.dpi).toBe(203);
    expect(
      createSettingsForm({ configured: false, supportedPaperSpecs: [] })
        .paperSpec,
    ).toBeUndefined();
  });

  it('sends independent return details only when selected', () => {
    const form = createSettingsForm({
      configured: true,
      supportedPaperSpecs: ['76x130'],
      senderName: '发件仓',
      returnName: '售后仓',
      returnSameAsSender: false,
    });
    expect(settingsPayload(form).returnName).toBe('售后仓');
    form.returnSameAsSender = true;
    expect(settingsPayload(form)).not.toHaveProperty('returnName');
    expect(settingsPayload(form).senderName).toBe('发件仓');
  });

  it('retains unsupported saved paper while allowing a deliberate replacement', () => {
    const form = createSettingsForm({
      configured: true,
      dpi: 203,
      paperHeightMm: 150,
      paperWidthMm: 100,
      supportedPaperSpecs: ['76x130'],
    });

    expect(form.paperSpec).toBe('100x150');
    expect(settingsPayload(form).paperWidthMm).toBeUndefined();
    expect(settingsPayload(form).paperHeightMm).toBeUndefined();
    expect(settingsPayload(form).dpi).toBeUndefined();

    form.paperSpec = '76x130';
    expect(settingsPayload(form)).toMatchObject({
      dpi: 203,
      paperHeightMm: 130,
      paperWidthMm: 76,
    });
  });

  it('preserves a known paper size when the platform has no templates', () => {
    const form = createSettingsForm({
      configured: true,
      dpi: 203,
      paperHeightMm: 150,
      paperWidthMm: 100,
      supportedPaperSpecs: [],
    });

    expect(form.paperSpec).toBe('100x150');
    expect(form.hasUnavailableSavedPaper).toBe(true);
    expect(settingsPayload(form).paperWidthMm).toBeUndefined();
  });
});
