type SetupDevice = {
  defaultFlag?: boolean;
  id?: number;
  lastPollTime?: string;
  pending?: boolean;
  printerName?: string;
  status: number;
};

export type DeviceSetupState = {
  description: string;
  key: 'not-configured' | 'printer-required' | 'ready' | 'waiting-connection';
  title: string;
  type: 'info' | 'success' | 'warning';
};

export function getDeviceSetupState(devices: SetupDevice[]): DeviceSetupState {
  const enabled = devices.filter(
    (device) =>
      device.status === 0 &&
      (device.pending || !!device.lastPollTime || !!device.printerName?.trim()),
  );
  if (enabled.length === 0) {
    return {
      description: '下载配置文件并导入 PrintBridge。',
      key: 'not-configured',
      title: '尚未配置打印设备',
      type: 'info',
    };
  }
  if (enabled.every((device) => device.pending)) {
    return {
      description: '导入配置后保持 PrintBridge 运行，设备会自动连接。',
      key: 'waiting-connection',
      title: '等待 PrintBridge 首次连接',
      type: 'warning',
    };
  }
  if (
    enabled.some((device) => !device.pending && !device.printerName?.trim())
  ) {
    return {
      description: '检测本机后选择得力打印机，系统会自动完成绑定。',
      key: 'printer-required',
      title: '设备已连接，尚未选择打印机',
      type: 'warning',
    };
  }
  return {
    description: '正式面单将发送到已绑定的 Windows 打印机。',
    key: 'ready',
    title: '打印设备已就绪',
    type: 'success',
  };
}

export function isReadyPrintDevice(device: SetupDevice) {
  return device.status === 0 && !device.pending && !!device.printerName?.trim();
}

export function selectReadyPrintDeviceId(
  devices: SetupDevice[],
  currentId?: number,
) {
  const readyDevices = devices.filter(
    (device) => device.id !== undefined && isReadyPrintDevice(device),
  );
  if (readyDevices.some((device) => device.id === currentId)) return currentId;
  return (
    readyDevices.find((device) => device.defaultFlag)?.id ?? readyDevices[0]?.id
  );
}

export function isEnrollmentExpired(
  device: { enrollmentExpiresTime?: string; pending?: boolean },
  now = Date.now(),
) {
  return (
    device.pending === true &&
    !!device.enrollmentExpiresTime &&
    new Date(device.enrollmentExpiresTime).getTime() <= now
  );
}
