import { Preferences } from '@capacitor/preferences';
import CryptoJS from 'crypto-js';

// Khóa bí mật để mã hóa (Nên để trong file .env)
const SECRET_KEY = 'your-secure-key-123';

class StorageService {
  /**
   * Lưu dữ liệu (Tự động stringify nếu là object)
   * @param encrypt Nếu true sẽ mã hóa dữ liệu trước khi lưu
   */
  async set(key: string, value: any, encrypt = false): Promise<void> {
    let stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

    if (encrypt) {
      stringValue = CryptoJS.AES.encrypt(stringValue, SECRET_KEY).toString();
    }

    await Preferences.set({
      key,
      value: stringValue,
    });
  }

  /**
   * Lấy dữ liệu
   * @param isObject Nếu true sẽ tự động parse JSON
   * @param encrypted Nếu true sẽ giải mã dữ liệu sau khi lấy
   */
  async get(key: string, isObject = false, encrypted = false): Promise<any> {
    const { value } = await Preferences.get({ key });

    if (!value) return null;

    let finalValue = value;

    if (encrypted) {
      const bytes = CryptoJS.AES.decrypt(value, SECRET_KEY);
      finalValue = bytes.toString(CryptoJS.enc.Utf8);
    }

    try {
      return isObject ? JSON.parse(finalValue) : finalValue;
    } catch (e) {
      return finalValue;
    }
  }

  /**
   * Xóa một key cụ thể
   */
  async remove(key: string): Promise<void> {
    await Preferences.remove({ key });
  }

  /**
   * Xóa sạch bách (Dùng khi Logout)
   */
  async clear(): Promise<void> {
    await Preferences.clear();
  }

  /**
   * Lấy danh sách tất cả các keys đang lưu
   */
  async keys(): Promise<string[]> {
    const { keys } = await Preferences.keys();
    return keys;
  }
}

// Export một instance duy nhất để dùng khắp app
const storageService = new StorageService();
export default storageService;