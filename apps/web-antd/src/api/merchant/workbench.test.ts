import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  agreeMerchantAfterSale,
  createMerchantProduct,
  deliverMerchantOrder,
  enrollMerchantPrintDevice,
  getMerchantAfterSalePage,
  getMerchantBrandPage,
  getMerchantOrderPage,
  getMerchantPrintDevices,
  getMerchantProductCategories,
  getMerchantProductDetail,
  getMerchantProductPage,
  getMerchantSfConfig,
  getMerchantShopProfile,
  saveMerchantPrintDevice,
  testMerchantPrintDevice,
  updateMerchantSfConfig,
  updateMerchantShopProfile,
  uploadMerchantProductImage,
} from './workbench';

const client = vi.hoisted(() => ({
  delete: vi.fn(),
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  upload: vi.fn(),
}));

vi.mock('#/api/request', () => ({ merchantRequestClient: client }));

describe('merchant workbench API', () => {
  beforeEach(() => vi.clearAllMocks());

  it('calls only merchant-owned product and brand page endpoints', async () => {
    const params = { pageNo: 2, pageSize: 20 };
    await getMerchantProductPage(params);
    await getMerchantBrandPage(params);

    expect(client.get).toHaveBeenNthCalledWith(
      1,
      '/product/merchant/spu/page',
      { params },
    );
    expect(client.get).toHaveBeenNthCalledWith(
      2,
      '/product/merchant/brand/page',
      { params },
    );
  });

  it('uses merchant endpoints for fulfillment and after-sale actions', async () => {
    const params = { pageNo: 1, pageSize: 10 };
    await getMerchantOrderPage(params);
    await deliverMerchantOrder({
      id: 40,
      logisticsId: 3,
      logisticsNo: 'SF001',
      subOrderId: 41,
    });
    await getMerchantAfterSalePage(params);
    await agreeMerchantAfterSale(52);

    expect(client.get).toHaveBeenNthCalledWith(
      1,
      '/trade/merchant/order/page',
      { params },
    );
    expect(client.put).toHaveBeenCalledWith('/trade/merchant/order/delivery', {
      id: 40,
      logisticsId: 3,
      logisticsNo: 'SF001',
      subOrderId: 41,
    });
    expect(client.get).toHaveBeenNthCalledWith(
      2,
      '/trade/merchant/after-sale/page',
      { params },
    );
    expect(client.put).toHaveBeenCalledWith(
      '/trade/merchant/after-sale/agree',
      undefined,
      { params: { id: 52 } },
    );
  });

  it('uses the shop profile endpoints for approved merchants', async () => {
    await getMerchantShopProfile();
    await updateMerchantShopProfile({
      description: '手作面包',
      logoUrl: '/shop.png',
      merchantId: 3,
      storeName: '晨光面包房',
    });

    expect(client.get).toHaveBeenCalledWith('/product/merchant/profile/get');
    expect(client.put).toHaveBeenCalledWith(
      '/product/merchant/profile/update',
      {
        description: '手作面包',
        logoUrl: '/shop.png',
        merchantId: 3,
        storeName: '晨光面包房',
      },
    );
  });

  it('uses authenticated merchant endpoints for product setup and images', async () => {
    const file = new File(['image'], 'tea.png', { type: 'image/png' });
    await getMerchantProductCategories();
    await getMerchantProductDetail(31);
    await createMerchantProduct({ name: '春茶' });
    await uploadMerchantProductImage(file);

    expect(client.get).toHaveBeenNthCalledWith(
      1,
      '/product/merchant/spu/category-list',
    );
    expect(client.get).toHaveBeenNthCalledWith(
      2,
      '/product/merchant/spu/get-detail?id=31',
    );
    expect(client.post).toHaveBeenCalledWith('/product/merchant/spu/create', {
      name: '春茶',
    });
    expect(client.upload).toHaveBeenCalledWith(
      '/infra/file/product-image-upload',
      { file },
    );
  });
});

it('uses the merchant session for SF settings and printer setup', async () => {
  await getMerchantSfConfig();
  await updateMerchantSfConfig({ monthlyCard: '1234' });
  await getMerchantPrintDevices();
  await enrollMerchantPrintDevice();
  const device = {
    id: 8,
    deviceName: '仓库',
    printerName: '标签机',
    defaultFlag: true,
    status: 0,
  };
  await saveMerchantPrintDevice(device);
  const diagnostic = { paperWidthMm: 76, paperHeightMm: 130 };
  await testMerchantPrintDevice(8, diagnostic);
  expect(client.get).toHaveBeenCalledWith(
    '/trade/merchant/logistics/sf-config',
  );
  expect(client.put).toHaveBeenCalledWith(
    '/trade/merchant/logistics/sf-config',
    { monthlyCard: '1234' },
  );
  expect(client.get).toHaveBeenCalledWith(
    '/trade/merchant/logistics/sf/devices',
  );
  expect(client.post).toHaveBeenCalledWith(
    '/trade/merchant/logistics/sf/devices/enroll',
  );
  expect(client.post).toHaveBeenCalledWith(
    '/trade/merchant/logistics/sf/devices',
    device,
  );
  expect(client.post).toHaveBeenCalledWith(
    '/trade/merchant/logistics/sf/devices/8/test-print',
    diagnostic,
  );
});
