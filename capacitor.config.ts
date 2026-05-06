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
<<<<<<< HEAD
  // server: {
  //   url: 'http://10.144.100.68:8100',
  //   cleartext: true,
  //   allowNavigation: ['10.144.100.68', '*.10.144.100.68']
  // }
=======
  server: {
    url: 'http://10.0.149.28:8100',
    cleartext: true,
    allowNavigation: ['10.0.149.28', '*.10.0.149.28']
  }
>>>>>>> upstream/HEAD
};

export default config;