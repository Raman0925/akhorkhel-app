/**
 * Families-policy ad configuration (handover 3.1). Applied before the SDK initialises and to every
 * request. Never relax these values.
 */
import {
  AgeRestrictedTreatment,
  MaxAdContentRating,
  type RequestConfiguration,
  type RequestOptions,
} from 'react-native-google-mobile-ads';

/**
 * Child-directed (COPPA) + under age of consent (GDPR) + G-rated ads only. SDK 17 maps the legacy
 * booleans to `ageRestrictedTreatment`; we set both so either code path ends up at CHILD.
 */
export const CHILD_DIRECTED_REQUEST_CONFIG: RequestConfiguration = {
  ageRestrictedTreatment: AgeRestrictedTreatment.CHILD,
  tagForChildDirectedTreatment: true,
  tagForUnderAgeOfConsent: true,
  maxAdContentRating: MaxAdContentRating.G,
};

/** Every ad request: non-personalised only. No keywords, content URLs or identifiers. */
export const AD_REQUEST_OPTIONS: RequestOptions = { requestNonPersonalizedAdsOnly: true };

export const CONFIG_LOG_MESSAGE =
  '[ads] AdMob configured: child-directed treatment ON, under-age-of-consent ON, max content rating G, non-personalized ads only.';
