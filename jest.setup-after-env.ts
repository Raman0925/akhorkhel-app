import { configure } from '@testing-library/react-native';

import { mockAudio } from './jest/mocks/assets';

// Screen tests can be slow on CI and cold caches; avoid flaky findBy* timeouts.
configure({ asyncUtilTimeout: 5000 });

// Every test starts with all recordings "bundled"; tests of the launch state call mockAudio('none').
beforeEach(() => mockAudio('all'));
