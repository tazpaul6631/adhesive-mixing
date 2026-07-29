import { useWakeLock } from '@vueuse/core';

/**
 * Giữ màn hình sáng khi đang dùng cân — giảm case Android tắt màn ~5 phút
 * rồi resume nặng (decrypt draft + reconnect USB) trên máy RAM thấp.
 * Không đổi logic cân / save / API.
 */
export function useScaleKeepAwake() {
  const { isSupported, request, release } = useWakeLock();

  const requestKeepAwake = async () => {
    if (!isSupported.value) return;
    try {
      await request('screen');
    } catch (error) {
      // Một số WebView/Android từ chối Wake Lock — bỏ qua, không ảnh hưởng cân.
      console.warn('[useScaleKeepAwake] request failed:', error);
    }
  };

  const releaseKeepAwake = async () => {
    if (!isSupported.value) return;
    try {
      await release();
    } catch (error) {
      console.warn('[useScaleKeepAwake] release failed:', error);
    }
  };

  return {
    requestKeepAwake,
    releaseKeepAwake,
  };
}
