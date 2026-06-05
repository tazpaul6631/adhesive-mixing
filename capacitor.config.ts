import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'adhesive.mixing',
  appName: 'adhesive-mixing',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: {
      enabled: false,
    },
    CapacitorSQLite: {
      iosIsEncryption: false,
      iosKeychainPrefix: 'adhesive-mixing',
      androidIsEncryption: false,
      logging: false,
    },
  },
  // server: {
  //   url: 'http://10.0.149.28:8100',
  //   cleartext: true,
  //   allowNavigation: ['10.0.149.28', '*.10.0.149.28']
  // }
};

export default config;