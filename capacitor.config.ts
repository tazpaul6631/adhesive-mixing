import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.thuan.adhesive.mixing',
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
  server: {
    url: 'http://10.120.177.197:8100',
    cleartext: true,
    allowNavigation: ['10.120.177.197', '*.10.120.177.197']
  }
};

export default config;