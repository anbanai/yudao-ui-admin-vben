import { describe, expect, it } from 'vitest';

import {
  getMaterialImageValidationError,
  getProductImageValidationError,
  MATERIAL_IMAGE_MAX_SIZE_BYTES,
  PRODUCT_IMAGE_MAX_SIZE_BYTES,
} from './policy';

describe('product image upload policy', () => {
  it('accepts supported formats up to and including 3MB', () => {
    expect(
      getProductImageValidationError(
        'product.JPG',
        PRODUCT_IMAGE_MAX_SIZE_BYTES,
      ),
    ).toBeNull();
    expect(getProductImageValidationError('product.png', 1)).toBeNull();
    expect(getProductImageValidationError('product.bmp', 1)).toBeNull();
  });

  it('rejects GIF and images larger than 3MB', () => {
    expect(getProductImageValidationError('product.gif', 1)).toContain(
      '仅支持',
    );
    expect(
      getProductImageValidationError(
        'product.jpg',
        PRODUCT_IMAGE_MAX_SIZE_BYTES + 1,
      ),
    ).toContain('3MB');
  });
});

describe('material image upload policy', () => {
  it('accepts GIF, JPG, PNG and BMP up to 10MB', () => {
    expect(
      getMaterialImageValidationError(
        'material.gif',
        MATERIAL_IMAGE_MAX_SIZE_BYTES,
      ),
    ).toBeNull();
    expect(getMaterialImageValidationError('material.jpg', 1)).toBeNull();
    expect(getMaterialImageValidationError('material.png', 1)).toBeNull();
    expect(getMaterialImageValidationError('material.bmp', 1)).toBeNull();
  });

  it('rejects unsupported formats and files larger than 10MB', () => {
    expect(getMaterialImageValidationError('material.webp', 1)).toContain(
      '仅支持',
    );
    expect(
      getMaterialImageValidationError(
        'material.jpg',
        MATERIAL_IMAGE_MAX_SIZE_BYTES + 1,
      ),
    ).toContain('10MB');
  });
});
