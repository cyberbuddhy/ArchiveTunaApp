import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.cyberbuddhy.archivetuna',
  appName: 'ArchiveTuna',
  webDir: 'dist',
  backgroundColor: '#1A1A1A',
  android: {
    // Audio + cover art stream over HTTPS only; no cleartext needed.
    allowMixedContent: false,
  },
};

export default config;
