import { requestClient } from '#/api/request';

export namespace MemberSocialApi {
  export interface WxaQrcodeRequest {
    path: string;
    scene: string;
    width?: number;
  }
}

export async function getWxaQrcode(
  data: MemberSocialApi.WxaQrcodeRequest,
): Promise<string> {
  const base64 = await requestClient.post<string>(
    `${import.meta.env.VITE_BASE_URL}/app-api/member/social-user/wxa-qrcode`,
    { autoColor: true, checkPath: false, hyaline: false, width: 280, ...data },
  );
  return `data:image/png;base64,${base64}`;
}
