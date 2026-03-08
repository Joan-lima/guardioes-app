module.exports = function (api) {
  api.cache(true);

  // nativewind/babel → react-native-css-interop/babel unconditionally adds
  // "react-native-worklets/plugin" which is only needed for native (Reanimated 4).
  // On web, className and CSS work natively — no babel interop transform needed.
  const isWeb =
    api.caller((caller) => caller?.platform === "web") ||
    api.caller((caller) => caller?.name === "babel-loader");

  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind", reanimated: false, worklets: false }],
      ...(isWeb ? [] : ["nativewind/babel"]),
    ],
  };
};
