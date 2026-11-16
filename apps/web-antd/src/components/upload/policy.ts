export const PRODUCT_IMAGE_ACCEPT = ['jpg', 'jpeg', 'png', 'bmp'] as const;
export const PRODUCT_IMAGE_MAX_SIZE_BYTES = 3 * 1024 * 1024;
export const MATERIAL_IMAGE_ACCEPT = [
  'gif',
  'jpg',
  'jpeg',
  'png',
  'bmp',
] as const;
export const MATERIAL_IMAGE_MAX_SIZE_BYTES = 10 * 1024 * 1024;

export function getProductImageValidationError(
  fileName: string,
  fileSize: number,
): null | string {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (!extension || !PRODUCT_IMAGE_ACCEPT.some((item) => item === extension)) {
    return '商品图片仅支持 JPG、PNG、BMP 格式';
  }
  if (fileSize > PRODUCT_IMAGE_MAX_SIZE_BYTES) {
    return '商品图片大小不能超过 3MB，请压缩后再上传';
  }
  return null;
}

export function getMaterialImageValidationError(
  fileName: string,
  fileSize: number,
): null | string {
  const extension = fileName.split('.').pop()?.toLowerCase();
  if (!extension || !MATERIAL_IMAGE_ACCEPT.some((item) => item === extension)) {
    return '素材图片仅支持 GIF、JPG、PNG、BMP 格式';
  }
  if (fileSize > MATERIAL_IMAGE_MAX_SIZE_BYTES) {
    return '素材图片大小不能超过 10MB';
  }
  return null;
}
