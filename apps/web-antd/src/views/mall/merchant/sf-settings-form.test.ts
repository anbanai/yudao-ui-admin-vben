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
});
