/**
 * Adopts the UIScene life cycle on iOS. Built with the iOS 27 SDK, UIKit
 * asserts at launch (EXC_BREAKPOINT in
 * _UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption) unless the app
 * declares a scene delegate. Expo ships ExpoAppSceneDelegate for this, but the
 * AppDelegate template from prebuild doesn't use it yet, so wire it up here:
 * the scene delegate creates the window and starts React Native, the app
 * delegate only creates the factory.
 */
const { withAppDelegate, withInfoPlist } = require('expo/config-plugins');

const START_IN_APP_DELEGATE = `#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif
`;

module.exports = function withSceneDelegate(config) {
  config = withInfoPlist(config, (cfg) => {
    cfg.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: 'EXExpoAppSceneDelegate',
          },
        ],
      },
    };
    return cfg;
  });

  return withAppDelegate(config, (cfg) => {
    let src = cfg.modResults.contents;
    if (src.includes('ExpoReactNativeFactoryProvider')) return cfg;
    if (!src.includes(START_IN_APP_DELEGATE)) {
      throw new Error('withSceneDelegate: AppDelegate template changed; update the plugin.');
    }
    src = src
      .replace(
        'class AppDelegate: ExpoAppDelegate {',
        'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {',
      )
      .replace(START_IN_APP_DELEGATE, '');
    cfg.modResults.contents = src;
    return cfg;
  });
};
