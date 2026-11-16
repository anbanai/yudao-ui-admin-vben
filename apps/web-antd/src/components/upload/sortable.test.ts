import { describe, expect, it } from 'vitest';

import imageUploadSource from './image-upload.vue?raw';
import { moveArrayItem } from './sortable';

describe('moveArrayItem', () => {
  it('moves one uploaded image while preserving the other image order', () => {
    expect(moveArrayItem(['a', 'b', 'c'], 2, 0)).toEqual(['c', 'a', 'b']);
    expect(moveArrayItem(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a']);
  });

  it('returns a copy when indexes are invalid or equal', () => {
    const source = ['a', 'b'];
    expect(moveArrayItem(source, -1, 1)).toEqual(source);
    expect(moveArrayItem(source, 0, 0)).toEqual(source);
    expect(moveArrayItem(source, 0, 9)).toEqual(source);
    expect(moveArrayItem(source, 0, 0)).not.toBe(source);
  });
});

describe('ImageUpload sortable state', () => {
  it('does not initialize dragging while the upload is disabled', () => {
    expect(imageUploadSource).toContain('!props.sortable || props.disabled');
    expect(imageUploadSource).toContain('props.disabled');
  });
});
