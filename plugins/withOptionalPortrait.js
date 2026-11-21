/**
 * Locking the activity to portrait (app.json "orientation") makes Android imply
 * <uses-feature android.hardware.screen.portrait required="true">, which hides
 * the app on Google Play for tablets, Chromebooks and Android XR. Declaring the
 * feature as optional keeps the portrait lock but lets those devices install it.
 */
const { withAndroidManifest } = require('expo/config-plugins');

const FEATURE = 'android.hardware.screen.portrait';

module.exports = function withOptionalPortrait(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const features = (manifest['uses-feature'] ??= []);
    const existing = features.find((f) => f.$['android:name'] === FEATURE);
    if (existing) existing.$['android:required'] = 'false';
    else features.push({ $: { 'android:name': FEATURE, 'android:required': 'false' } });
    return cfg;
  });
};
