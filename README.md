# Html Webpack Skip Assets Plugin

> 🔥 Adapt `html-webpack-skip-assets-plugin` to `Rspack`

> 🔥 `Rspack` does not support adding undefined properties to `HtmlRspackPlugin`, so `skipAssets` and similar properties cannot be used, which is different from the original plugin

> 🔥 You can see the unit test for more usage

---

## Configuration

1. Install via `npm i -D html-rspack-skip-assets-plugin`
1. Add to your webpack config AFTER HtmlWebpackPlugin
```javascript
    import { HtmlRspackSkipAssetsPlugin } from 'html-rspack-skip-assets-plugin'
    ...
    plugins: [
        new rspack.HtmlRspackPlugin({
            filename: join(OUTPUT_DIR, './dist/index.html'),
            // ⚠️ N.B. Rspack does not support adding undefined properties to HtmlRspackPlugin, so this code will throw an error!
            // excludeAssets: ['polyfill.**.js', /styles\..*js$/i, (asset) => (asset.attributes && asset.attributes['x-skip'])]
            // skipAssets: ['polyfill.**.js', /styles\..*js$/i, (asset) => (asset.attributes && asset.attributes['x-skip'])]
        }),
        new HtmlRspackSkipAssetsPlugin({
            // or they can be passed in on the plugin. These 4 lists are combined before running
            excludeAssets: ['polyfill.**.js', /styles\..*js$/i, (asset) => (asset.attributes && asset.attributes['x-skip'])]
            // OR
            skipAssets: ['polyfill.**.js', /styles\..*js$/i, (asset) => (asset.attributes && asset.attributes['x-skip'])]
        })
    ]
```

The plugin takes a configuration argument with a key called `skipAssets`. This is an array of file globs (provided via [minimatch](https://github.com/isaacs/minimatch)), regex patterns, or functions which accept the asset and return a boolean representing wheter or not to skip adding to the output html. In order to ease migration from [html-webpack-exclude-assets-plugin](https://www.npmjs.com/package/html-webpack-exclude-assets-plugin), the plugin also supports passing `excludeAssets` as the option key, as well as the ability to add either key to the HtmlWebpackPlugin options. All provided lists will be concatenated and used to filter the assets.

## Custom insertion

This exclusion will also work for `inject: false`:

```js
new rspack.HtmlRspackPlugin({
  inject: false,
})
```

## Testing
Testing is done via ts-node and mocha. Test files can be found in `/spec`, and will be auto-discovered as long as the file ends in `.spec.ts`. Just run `npm test` after installing to see the tests run.
