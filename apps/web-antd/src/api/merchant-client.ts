export function getMerchantApiURL(adminApiURL = '') {
  const normalizedURL = adminApiURL.replace(/\/$/, '');
  if (/\/admin-api$/i.test(normalizedURL)) {
    return normalizedURL.replace(/\/admin-api$/i, '/merchant-api');
  }
  return `${normalizedURL}/merchant-api`;
}
