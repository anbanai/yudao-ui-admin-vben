export interface MerchantProductFormValues {
  brandId: number;
  categoryId: number;
  description?: string;
  imageUrl: string;
  name: string;
  price: number | string;
  stock: number;
}

function toCents(value: number | string) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('请填写大于 0 的商品价格');
  }
  return Math.round(amount * 100);
}

export function buildMerchantProductPayload(values: MerchantProductFormValues) {
  const name = values.name.trim();
  const imageUrl = values.imageUrl.trim();
  if (
    !name ||
    !imageUrl ||
    !Number.isInteger(values.categoryId) ||
    values.categoryId <= 0 ||
    !Number.isInteger(values.brandId) ||
    values.brandId <= 0 ||
    !Number.isInteger(values.stock) ||
    values.stock < 0
  ) {
    throw new Error('请完整填写商品信息');
  }

  const price = toCents(values.price);
  const description = values.description?.trim() || name;
  return {
    brandId: values.brandId,
    browseCount: 0,
    categoryId: values.categoryId,
    description,
    deliveryTypes: [1],
    giveIntegral: 0,
    introduction: description,
    keyword: name,
    name,
    picUrl: imageUrl,
    salesCount: 0,
    sliderPicUrls: [imageUrl],
    skus: [
      {
        marketPrice: price,
        name,
        picUrl: imageUrl,
        price,
        properties: [],
        stock: values.stock,
      },
    ],
    sort: 0,
    specType: false,
    subCommissionType: false,
    virtualSalesCount: 0,
  };
}

/** Preserve existing specifications, logistics, gallery and marketing settings on edit. */
export function buildMerchantProductUpdatePayload(
  original: Record<string, any>,
  values: MerchantProductFormValues,
  skuValues: Array<{ price: number | string; stock: number }>,
) {
  const skus = original.skus as Array<Record<string, any>> | undefined;
  if (!skus?.length || skuValues.length !== skus.length) {
    throw new Error('请重新加载完整商品规格');
  }
  const basic = buildMerchantProductPayload({
    ...values,
    price: skuValues[0]!.price,
    stock: skuValues[0]!.stock,
  });
  return {
    ...original,
    brandId: basic.brandId,
    categoryId: basic.categoryId,
    description: basic.description,
    name: basic.name,
    picUrl: basic.picUrl,
    skus: skus.map((sku, index) => {
      const edited = skuValues[index]!;
      if (!Number.isInteger(edited.stock) || edited.stock < 0) {
        throw new Error('请填写正确的规格库存');
      }
      return { ...sku, price: toCents(edited.price), stock: edited.stock };
    }),
  };
}
