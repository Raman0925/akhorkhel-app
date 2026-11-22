/* Global Jest mocks for native modules. Keep them minimal and close to real behaviour. */
import { jest } from '@jest/globals';

import 'react-native-gesture-handler/jestSetup';

jest.mock('react-native-worklets', () => require('react-native-worklets/lib/module/mock'));
// Reanimated 4.8's initializer calls setCSSEventHandler, which its JS (Jest) module throws on.
// Stub only that call; everything else is the official mock.
jest.mock('react-native-reanimated/src/css/native/proxy', () => ({
  ...jest.requireActual<object>('react-native-reanimated/src/css/native/proxy'),
  setCSSEventHandler: () => undefined,
}));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

jest.mock(
  'react-native-safe-area-context',
  () => jest.requireActual<{ default: object }>('react-native-safe-area-context/jest/mock').default,
);

// Skia needs a GPU; screens under test only need the components to render as plain views.
jest.mock('@shopify/react-native-skia', () => require('./jest/mocks/skia'));

jest.mock('react-native-audio-api', () => require('./jest/mocks/audio-api'));

jest.mock('react-native-share', () => ({
  __esModule: true,
  default: { open: jest.fn(() => Promise.resolve({ success: true, message: '' })) },
}));

jest.mock('react-native-html-to-pdf', () => ({
  __esModule: true,
  generatePDF: jest.fn(() => Promise.resolve({ filePath: '/tmp/report.pdf' })),
  default: { convert: jest.fn(() => Promise.resolve({ filePath: '/tmp/report.pdf' })) },
}));

jest.mock('react-native-in-app-review', () => ({
  __esModule: true,
  default: {
    isAvailable: jest.fn(() => true),
    RequestInAppReview: jest.fn(() => Promise.resolve(true)),
  },
}));

// react-native-mmkv uses its in-memory mock under Jest; only the Nitro import needs stubbing.
jest.mock('react-native-nitro-modules', () => ({
  NitroModules: {
    createHybridObject: jest.fn(() => {
      throw new Error('Nitro hybrid objects are not available in Jest');
    }),
  },
}));
