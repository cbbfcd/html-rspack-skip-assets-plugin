import { join, dirname } from "path";
import { fileURLToPath } from 'url';
import { readFileSync } from "fs";
import { expect } from "chai";
import { rspack } from "@rspack/core";
import { rimraf } from "rimraf";
import { HtmlRspackSkipAssetsPlugin } from "../dist/plugin.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const OUTPUT_DIR = join(__dirname, "./test_dist");

const HtmlWebpackPluginOptions = {
  filename: "index.html",
  hash: false,
  inject: "body",
  minify: true,
  // showErrors: true,
  template: join(__dirname, "./test_data/index.html"),
};

const webpackDevOptions = {
  mode: "development",
  entry: {
    app: join(__dirname, "./test_data/entry.js"),
    polyfill: join(__dirname, "./test_data/polyfill.js"),
    styles: join(__dirname, "./test_data/styles.css"),
  },
  output: {
    path: OUTPUT_DIR,
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [
          {
            loader: rspack.CssExtractRspackPlugin.loader,
          },
          {
            loader: "css-loader",
          },
        ],
      },
    ],
  },
  plugins: [
    new rspack.CssExtractRspackPlugin({
      filename: "[name].css",
    }),
  ],
};

const webpackProdOptions = {
  ...webpackDevOptions,
  output: {
    filename: "[name].[contenthash].min.js",
    path: OUTPUT_DIR,
    pathinfo: true,
  },
  mode: "production",
  plugins: [
    new rspack.CssExtractRspackPlugin({
      filename: "[name].[contenthash].min.css",
    }),
  ],
};

function getOutput() {
  const htmlFile = join(OUTPUT_DIR, "./index.html");
  const htmlContents = readFileSync(htmlFile).toString("utf8");
  expect(!!htmlContents).to.be.true;
  return htmlContents;
}

const configs = [
  {
    name: "Development",
    options: webpackDevOptions,
  },
  {
    name: "Production",
    options: webpackProdOptions,
  },
];

configs.forEach((c) => {
  // have to use `function` instead of arrow so we can see `this`
  describe(`HtmlRspackSkipAssetsPlugin ${c.name} Mode`, function () {
    // set timeout to 5s because webpack is slow
    this.timeout(5000);

    afterEach((done) => {
      rimraf(OUTPUT_DIR).then(() => done());
    });

    it("should do nothing when no patterns are specified", (done) => {
      rspack(
        {
          ...c.options,
          plugins: [
            ...(c.options.plugins ?? []),
            new rspack.HtmlRspackPlugin(HtmlWebpackPluginOptions),
            new HtmlRspackSkipAssetsPlugin(),
          ],
        },
        (err) => {
          expect(!!err).to.be.false;
          const html = getOutput();
          expect(
            /script\s+.*?src\s*=\s*"(\/)?polyfill(\.[a-z0-9]+\.min)?\.js"/i.test(
              html
            ),
            "could not find polyfill bundle"
          ).to.be.true;
          expect(
            /script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(
              html
            ),
            "could not find app bundle"
          ).to.be.true;
          expect(
            /script\s+.*?src\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.js"/i.test(
              html
            ),
            "could not find styles js bundle"
          ).to.be.true;
          expect(
            /link\s+.*?href\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.css"/i.test(
              html
            ),
            "could not find styles css bundle"
          ).to.be.true;
          done();
        }
      );
    });

    it("should not fail on meta links", (done) => {
      rspack(
        {
          ...c.options,
          plugins: [
            ...(c.options.plugins ?? []),
            new rspack.HtmlRspackPlugin({
              ...HtmlWebpackPluginOptions,
              meta: {
                robots: `none`,
              },
            }),
            new HtmlRspackSkipAssetsPlugin({
              skipAssets: [/styles\..*js/],
            }),
          ],
        },
        (err, stats) => {
          expect(!!err).to.be.false;
          expect(stats?.hasErrors()).to.be.false;
          const html = getOutput();
          expect(
            /script\s+.*?src\s*=\s*"(\/)?polyfill(\.[a-z0-9]+\.min)?\.js"/i.test(
              html
            ),
            "could not find polyfill bundle"
          ).to.be.true;
          expect(
            /script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(
              html
            ),
            "could not find app bundle"
          ).to.be.true;
          expect(
            /script\s+.*?src\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.js"/i.test(
              html
            ),
            "did not skip styles js bundle"
          ).to.be.false;
          expect(
            /link\s+.*?href\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.css"/i.test(
              html
            ),
            "could not find styles css bundle"
          ).to.be.true;
          expect(
            /meta\s+.*?name\s*=\s*"robots"/i.test(html),
            "could not find meta tag"
          ).to.be.true;
          done();
        }
      );
    });

    it("should skip adding asset if the pattern matches - plugin.skipAssets.minimatch", (done) => {
      rspack(
        {
          ...c.options,
          plugins: [
            ...(c.options.plugins ?? []),
            new rspack.HtmlRspackPlugin(HtmlWebpackPluginOptions),
            new HtmlRspackSkipAssetsPlugin({
              skipAssets: ["styles**.js"],
            }),
          ],
        },
        (err) => {
          expect(!!err).to.be.false;
          const html = getOutput();
          expect(
            /script\s+.*?src\s*=\s*"(\/)?polyfill(\.[a-z0-9]+\.min)?\.js"/i.test(
              html
            ),
            "could not find polyfill bundle"
          ).to.be.true;
          expect(
            /script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(
              html
            ),
            "could not find app bundle"
          ).to.be.true;
          expect(
            /script\s+.*?src\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.js"/i.test(
              html
            ),
            "did not skip styles js bundle"
          ).to.be.false;
          expect(
            /link\s+.*?href\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.css"/i.test(
              html
            ),
            "could not find styles css bundle"
          ).to.be.true;
          done();
        }
      );
    });

    it("should skip adding asset if the pattern matches - plugin.excludeAssets.minimatch", (done) => {
      rspack(
        {
          ...c.options,
          plugins: [
            ...(c.options.plugins ?? []),
            new rspack.HtmlRspackPlugin(HtmlWebpackPluginOptions),
            new HtmlRspackSkipAssetsPlugin({
              excludeAssets: ["styles**.js"],
            }),
          ],
        },
        (err) => {
          expect(!!err).to.be.false;
          const html = getOutput();
          expect(
            /script\s+.*?src\s*=\s*"(\/)?polyfill(\.[a-z0-9]+\.min)?\.js"/i.test(
              html
            ),
            "could not find polyfill bundle"
          ).to.be.true;
          expect(
            /script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(
              html
            ),
            "could not find app bundle"
          ).to.be.true;
          expect(
            /script\s+.*?src\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.js"/i.test(
              html
            ),
            "did not skip styles js bundle"
          ).to.be.false;
          expect(
            /link\s+.*?href\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.css"/i.test(
              html
            ),
            "could not find styles css bundle"
          ).to.be.true;
          done();
        }
      );
    });

    it("should skip adding asset if the pattern matches - plugin.skipAssets.regex", (done) => {
      rspack(
        {
          ...c.options,
          plugins: [
            ...(c.options.plugins ?? []),
            new rspack.HtmlRspackPlugin(HtmlWebpackPluginOptions),
            new HtmlRspackSkipAssetsPlugin({
              skipAssets: [/styles\..*js/i],
            }),
          ],
        },
        (err) => {
          expect(!!err).to.be.false;
          const html = getOutput();
          expect(
            /script\s+.*?src\s*=\s*"(\/)?polyfill(\.[a-z0-9]+\.min)?\.js"/i.test(
              html
            ),
            "could not find polyfill bundle"
          ).to.be.true;
          expect(
            /script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(
              html
            ),
            "could not find app bundle"
          ).to.be.true;
          expect(
            /script\s+.*?src\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.js"/i.test(
              html
            ),
            "did not skip styles js bundle"
          ).to.be.false;
          expect(
            /link\s+.*?href\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.css"/i.test(
              html
            ),
            "could not find styles css bundle"
          ).to.be.true;
          done();
        }
      );
    });

    it("should skip adding asset if the pattern matches - plugin.excludeAssets.regex", (done) => {
      rspack(
        {
          ...c.options,
          plugins: [
            ...(c.options.plugins ?? []),
            new rspack.HtmlRspackPlugin(HtmlWebpackPluginOptions),
            new HtmlRspackSkipAssetsPlugin({
              excludeAssets: [/styles\..*js/i],
            }),
          ],
        },
        (err) => {
          expect(!!err).to.be.false;
          const html = getOutput();
          expect(
            /script\s+.*?src\s*=\s*"(\/)?polyfill(\.[a-z0-9]+\.min)?\.js"/i.test(
              html
            ),
            "could not find polyfill bundle"
          ).to.be.true;
          expect(
            /script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(
              html
            ),
            "could not find app bundle"
          ).to.be.true;
          expect(
            /script\s+.*?src\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.js"/i.test(
              html
            ),
            "did not skip styles js bundle"
          ).to.be.false;
          expect(
            /link\s+.*?href\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.css"/i.test(
              html
            ),
            "could not find styles css bundle"
          ).to.be.true;
          done();
        }
      );
    });

    it("should skip adding asset if the pattern matches - plugin.skipAssets.regex-global", (done) => {
      rspack(
        {
          ...c.options,
          plugins: [
            ...(c.options.plugins ?? []),
            new rspack.HtmlRspackPlugin(HtmlWebpackPluginOptions),
            new HtmlRspackSkipAssetsPlugin({
              skipAssets: [/styles\./gi],
            }),
          ],
        },
        (err) => {
          expect(!!err).to.be.false;
          const html = getOutput();
          expect(
            /script\s+.*?src\s*=\s*"(\/)?polyfill(\.[a-z0-9]+\.min)?\.js"/i.test(
              html
            ),
            "could not find polyfill bundle"
          ).to.be.true;
          expect(
            /script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(
              html
            ),
            "could not find app bundle"
          ).to.be.true;
          expect(
            /script\s+.*?src\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.js"/i.test(
              html
            ),
            "did not skip styles js bundle"
          ).to.be.false;
          expect(
            /link\s+.*?href\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.css"/i.test(
              html
            ),
            "did not skip styles css bundle"
          ).to.be.false;
          done();
        }
      );
    });

    it("should skip adding asset if the pattern matches - plugin.excludeAssets.regex-global", (done) => {
      rspack(
        {
          ...c.options,
          plugins: [
            ...(c.options.plugins ?? []),
            new rspack.HtmlRspackPlugin(HtmlWebpackPluginOptions),
            new HtmlRspackSkipAssetsPlugin({
              excludeAssets: [/styles\./gi],
            }),
          ],
        },
        (err) => {
          expect(!!err).to.be.false;
          const html = getOutput();
          expect(
            /script\s+.*?src\s*=\s*"(\/)?polyfill(\.[a-z0-9]+\.min)?\.js"/i.test(
              html
            ),
            "could not find polyfill bundle"
          ).to.be.true;
          expect(
            /script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(
              html
            ),
            "could not find app bundle"
          ).to.be.true;
          expect(
            /script\s+.*?src\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.js"/i.test(
              html
            ),
            "did not skip styles js bundle"
          ).to.be.false;
          expect(
            /link\s+.*?href\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.css"/i.test(
              html
            ),
            "did not skip styles css bundle"
          ).to.be.false;
          done();
        }
      );
    });

    it("should skip adding asset if the pattern matches - plugin.skipAssets.callback", (done) => {
      rspack(
        {
          ...c.options,
          plugins: [
            ...(c.options.plugins ?? []),
            new rspack.HtmlRspackPlugin(HtmlWebpackPluginOptions),
            new HtmlRspackSkipAssetsPlugin({
              skipAssets: [
                (asset) => {
                  const attributes = (asset && asset.attributes) || {};
                  const src = (attributes.src || attributes.href);
                  return /styles\..*js/i.test(src);
                },
              ],
            }),
          ],
        },
        (err) => {
          expect(!!err).to.be.false;
          const html = getOutput();
          expect(
            /script\s+.*?src\s*=\s*"(\/)?polyfill(\.[a-z0-9]+\.min)?\.js"/i.test(
              html
            ),
            "could not find polyfill bundle"
          ).to.be.true;
          expect(
            /script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(
              html
            ),
            "could not find app bundle"
          ).to.be.true;
          expect(
            /script\s+.*?src\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.js"/i.test(
              html
            ),
            "did not skip styles js bundle"
          ).to.be.false;
          expect(
            /link\s+.*?href\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.css"/i.test(
              html
            ),
            "could not find styles css bundle"
          ).to.be.true;
          done();
        }
      );
    });

    it("should skip adding asset if the pattern matches - plugin.excludeAssets.callback", (done) => {
      rspack(
        {
          ...c.options,
          plugins: [
            ...(c.options.plugins ?? []),
            new rspack.HtmlRspackPlugin(HtmlWebpackPluginOptions),
            new HtmlRspackSkipAssetsPlugin({
              excludeAssets: [
                (asset) => {
                  const attributes = (asset && asset.attributes) || {};
                  const src = (attributes.src || attributes.href);
                  return /styles\..*js/i.test(src);
                },
              ],
            }),
          ],
        },
        (err) => {
          expect(!!err).to.be.false;
          const html = getOutput();
          expect(
            /script\s+.*?src\s*=\s*"(\/)?polyfill(\.[a-z0-9]+\.min)?\.js"/i.test(
              html
            ),
            "could not find polyfill bundle"
          ).to.be.true;
          expect(
            /script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(
              html
            ),
            "could not find app bundle"
          ).to.be.true;
          expect(
            /script\s+.*?src\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.js"/i.test(
              html
            ),
            "did not skip styles js bundle"
          ).to.be.false;
          expect(
            /link\s+.*?href\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.css"/i.test(
              html
            ),
            "could not find styles css bundle"
          ).to.be.true;
          done();
        }
      );
    });

    // Note: rspack does not support adding undefined properties to HtmlRspackPlugin, so this code will throw an error!

    // it("should skip adding asset if the pattern matches - parent.skipAssets.minimatch", (done) => {
    //   rspack(
    //     {
    //       ...c.options,
    //       plugins: [
    //         ...(c.options.plugins ?? []),
    //         new rspack.HtmlRspackPlugin({
    //           ...HtmlWebpackPluginOptions,
    //           skipAssets: ["styles**.js"],
    //         }),
    //         new HtmlRspackSkipAssetsPlugin(),
    //       ],
    //     },
    //     (err) => {
    //       expect(!!err).to.be.false;
    //       const html = getOutput();
    //       expect(
    //         /script\s+.*?src\s*=\s*"(\/)?polyfill(\.[a-z0-9]+\.min)?\.js"/i.test(
    //           html
    //         ),
    //         "could not find polyfill bundle"
    //       ).to.be.true;
    //       expect(
    //         /script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(
    //           html
    //         ),
    //         "could not find app bundle"
    //       ).to.be.true;
    //       expect(
    //         /script\s+.*?src\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.js"/i.test(
    //           html
    //         ),
    //         "did not skip styles js bundle"
    //       ).to.be.false;
    //       expect(
    //         /link\s+.*?href\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.css"/i.test(
    //           html
    //         ),
    //         "could not find styles css bundle"
    //       ).to.be.true;
    //       done();
    //     }
    //   );
    // });

    // it("should skip adding asset if the pattern matches - parent.excludeAssets.minimatch", (done) => {
    //   rspack(
    //     {
    //       ...c.options,
    //       plugins: [
    //         ...(c.options.plugins ?? []),
    //         new rspack.HtmlRspackPlugin({
    //           ...HtmlWebpackPluginOptions,
							
    //           excludeAssets: ["styles**.js"],
    //         }),
    //         new HtmlRspackSkipAssetsPlugin(),
    //       ],
    //     },
    //     (err) => {
    //       expect(!!err).to.be.false;
    //       const html = getOutput();
    //       expect(
    //         /script\s+.*?src\s*=\s*"(\/)?polyfill(\.[a-z0-9]+\.min)?\.js"/i.test(
    //           html
    //         ),
    //         "could not find polyfill bundle"
    //       ).to.be.true;
    //       expect(
    //         /script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(
    //           html
    //         ),
    //         "could not find app bundle"
    //       ).to.be.true;
    //       expect(
    //         /script\s+.*?src\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.js"/i.test(
    //           html
    //         ),
    //         "did not skip styles js bundle"
    //       ).to.be.false;
    //       expect(
    //         /link\s+.*?href\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.css"/i.test(
    //           html
    //         ),
    //         "could not find styles css bundle"
    //       ).to.be.true;
    //       done();
    //     }
    //   );
    // });

    // it("should skip adding asset if the pattern matches - parent.skipAssets.regex", (done) => {
    //   rspack(
    //     {
    //       ...c.options,
    //       plugins: [
    //         ...(c.options.plugins ?? []),
    //         new rspack.HtmlRspackPlugin({
    //           ...HtmlWebpackPluginOptions,
							
    //           skipAssets: [/styles\..*js/i],
    //         }),
    //         new HtmlRspackSkipAssetsPlugin(),
    //       ],
    //     },
    //     (err) => {
    //       expect(!!err).to.be.false;
    //       const html = getOutput();
    //       expect(
    //         /script\s+.*?src\s*=\s*"(\/)?polyfill(\.[a-z0-9]+\.min)?\.js"/i.test(
    //           html
    //         ),
    //         "could not find polyfill bundle"
    //       ).to.be.true;
    //       expect(
    //         /script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(
    //           html
    //         ),
    //         "could not find app bundle"
    //       ).to.be.true;
    //       expect(
    //         /script\s+.*?src\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.js"/i.test(
    //           html
    //         ),
    //         "did not skip styles js bundle"
    //       ).to.be.false;
    //       expect(
    //         /link\s+.*?href\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.css"/i.test(
    //           html
    //         ),
    //         "could not find styles css bundle"
    //       ).to.be.true;
    //       done();
    //     }
    //   );
    // });

    // it("should skip adding asset if the pattern matches - parent.excludeAssets.regex", (done) => {
    //   rspack(
    //     {
    //       ...c.options,
    //       plugins: [
    //         ...(c.options.plugins ?? []),
    //         new rspack.HtmlRspackPlugin({
    //           ...HtmlWebpackPluginOptions,
		// 					//@ts-ignore
    //           excludeAssets: [/styles\..*js/i],
    //         }),
    //         new HtmlRspackSkipAssetsPlugin(),
    //       ],
    //     },
    //     (err) => {
    //       expect(!!err).to.be.false;
    //       const html = getOutput();
    //       expect(
    //         /script\s+.*?src\s*=\s*"(\/)?polyfill(\.[a-z0-9]+\.min)?\.js"/i.test(
    //           html
    //         ),
    //         "could not find polyfill bundle"
    //       ).to.be.true;
    //       expect(
    //         /script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(
    //           html
    //         ),
    //         "could not find app bundle"
    //       ).to.be.true;
    //       expect(
    //         /script\s+.*?src\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.js"/i.test(
    //           html
    //         ),
    //         "did not skip styles js bundle"
    //       ).to.be.false;
    //       expect(
    //         /link\s+.*?href\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.css"/i.test(
    //           html
    //         ),
    //         "could not find styles css bundle"
    //       ).to.be.true;
    //       done();
    //     }
    //   );
    // });

    // it("should skip adding asset if the pattern matches - parent.skipAssets.regex-global", (done) => {
    //   rspack(
    //     {
    //       ...c.options,
    //       plugins: [
    //         ...(c.options.plugins ?? []),
    //         new rspack.HtmlRspackPlugin({
    //           ...HtmlWebpackPluginOptions,
							
    //           skipAssets: [/styles\./gi],
    //         }),
    //         new HtmlRspackSkipAssetsPlugin(),
    //       ],
    //     },
    //     (err) => {
    //       expect(!!err).to.be.false;
    //       const html = getOutput();
    //       expect(
    //         /script\s+.*?src\s*=\s*"(\/)?polyfill(\.[a-z0-9]+\.min)?\.js"/i.test(
    //           html
    //         ),
    //         "could not find polyfill bundle"
    //       ).to.be.true;
    //       expect(
    //         /script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(
    //           html
    //         ),
    //         "could not find app bundle"
    //       ).to.be.true;
    //       expect(
    //         /script\s+.*?src\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.js"/i.test(
    //           html
    //         ),
    //         "did not skip styles js bundle"
    //       ).to.be.false;
    //       expect(
    //         /link\s+.*?href\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.css"/i.test(
    //           html
    //         ),
    //         "did not skip styles css bundle"
    //       ).to.be.false;
    //       done();
    //     }
    //   );
    // });

    // it("should skip adding asset if the pattern matches - parent.excludeAssets.regex-global", (done) => {
    //   rspack(
    //     {
    //       ...c.options,
    //       plugins: [
    //         ...(c.options.plugins ?? []),
    //         new rspack.HtmlRspackPlugin({
    //           ...HtmlWebpackPluginOptions,
							
    //           excludeAssets: [/styles\./gi],
    //         }),
    //         new HtmlRspackSkipAssetsPlugin(),
    //       ],
    //     },
    //     (err) => {
    //       expect(!!err).to.be.false;
    //       const html = getOutput();
    //       expect(
    //         /script\s+.*?src\s*=\s*"(\/)?polyfill(\.[a-z0-9]+\.min)?\.js"/i.test(
    //           html
    //         ),
    //         "could not find polyfill bundle"
    //       ).to.be.true;
    //       expect(
    //         /script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(
    //           html
    //         ),
    //         "could not find app bundle"
    //       ).to.be.true;
    //       expect(
    //         /script\s+.*?src\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.js"/i.test(
    //           html
    //         ),
    //         "did not skip styles js bundle"
    //       ).to.be.false;
    //       expect(
    //         /link\s+.*?href\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.css"/i.test(
    //           html
    //         ),
    //         "did not skip styles css bundle"
    //       ).to.be.false;
    //       done();
    //     }
    //   );
    // });

    // it("should skip adding asset if the pattern matches - parent.skipAssets.callback", (done) => {
    //   rspack(
    //     {
    //       ...c.options,
    //       plugins: [
    //         ...(c.options.plugins ?? []),
    //         new rspack.HtmlRspackPlugin({
    //           ...HtmlWebpackPluginOptions,
							
    //           skipAssets: [
    //             (asset) => {
    //               const attributes = (asset && asset.attributes) || {};
    //               const src = (attributes.src || attributes.href);
    //               return /styles\..*js/i.test(src);
    //             },
    //           ],
    //         }),
    //         new HtmlRspackSkipAssetsPlugin(),
    //       ],
    //     },
    //     (err) => {
    //       expect(!!err).to.be.false;
    //       const html = getOutput();
    //       expect(
    //         /script\s+.*?src\s*=\s*"(\/)?polyfill(\.[a-z0-9]+\.min)?\.js"/i.test(
    //           html
    //         ),
    //         "could not find polyfill bundle"
    //       ).to.be.true;
    //       expect(
    //         /script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(
    //           html
    //         ),
    //         "could not find app bundle"
    //       ).to.be.true;
    //       expect(
    //         /script\s+.*?src\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.js"/i.test(
    //           html
    //         ),
    //         "did not skip styles js bundle"
    //       ).to.be.false;
    //       expect(
    //         /link\s+.*?href\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.css"/i.test(
    //           html
    //         ),
    //         "could not find styles css bundle"
    //       ).to.be.true;
    //       done();
    //     }
    //   );
    // });

    // it("should skip adding asset if the pattern matches - parent.excludeAssets.callback", (done) => {
    //   rspack(
    //     {
    //       ...c.options,
    //       plugins: [
    //         ...(c.options.plugins ?? []),
    //         new rspack.HtmlRspackPlugin({
    //           ...HtmlWebpackPluginOptions,
							
    //           excludeAssets: [
    //             (asset) => {
    //               const attributes = (asset && asset.attributes) || {};
    //               const src = (attributes.src || attributes.href);
    //               return /styles\..*js/i.test(src);
    //             },
    //           ],
    //         }),
    //         new HtmlRspackSkipAssetsPlugin(),
    //       ],
    //     },
    //     (err) => {
    //       expect(!!err).to.be.false;
    //       const html = getOutput();
    //       expect(
    //         /script\s+.*?src\s*=\s*"(\/)?polyfill(\.[a-z0-9]+\.min)?\.js"/i.test(
    //           html
    //         ),
    //         "could not find polyfill bundle"
    //       ).to.be.true;
    //       expect(
    //         /script\s+.*?src\s*=\s*"(\/)?app(\.[a-z0-9]+\.min)?\.js"/i.test(
    //           html
    //         ),
    //         "could not find app bundle"
    //       ).to.be.true;
    //       expect(
    //         /script\s+.*?src\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.js"/i.test(
    //           html
    //         ),
    //         "did not skip styles js bundle"
    //       ).to.be.false;
    //       expect(
    //         /link\s+.*?href\s*=\s*"(\/)?styles(\.[a-z0-9]+\.min)?\.css"/i.test(
    //           html
    //         ),
    //         "could not find styles css bundle"
    //       ).to.be.true;
    //       done();
    //     }
    //   );
    // });
  });
});
