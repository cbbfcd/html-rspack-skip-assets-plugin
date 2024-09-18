import { rspack, type Compiler } from "@rspack/core";
import { minimatch } from "minimatch";

export interface JsHtmlPluginTag {
  tagName: string
  attributes: Record<string, string | boolean | undefined | null>
  voidTag: boolean
  innerHTML?: string
  asset?: string
}

type AssetMatchFunction = (asset: JsHtmlPluginTag) => boolean;

export type AssetMatcher = string | RegExp | AssetMatchFunction;

export interface SkipAssetsConfig {
  /**
   * skipAssets {string | RegExp} - backwards compatible option
   */
  skipAssets?: AssetMatcher[];
  /**
   * excludeAssets {string | RegExp} - backwards compatible option
   */
  excludeAssets?: AssetMatcher[]; // for backwards compatibility
  // in case I want to add other optional configs later without breaking old uses
}

const PLUGIN_NAME = "HtmlRspackSkipAssetsPlugin";

export class HtmlRspackSkipAssetsPlugin {
  constructor(
    private _config: SkipAssetsConfig = { skipAssets: [], excludeAssets: [] }
  ) {}

  apply(compiler: Compiler) {
		compiler.hooks.compilation.tap(PLUGIN_NAME, compilation => {
			rspack.HtmlRspackPlugin.getCompilationHooks(compilation).alterAssetTagGroups.tap(PLUGIN_NAME, (pluginArgs) => {

				const filters = [
					...(this._config.skipAssets || []),
					...(this._config.excludeAssets || []),
					// N.B. Rspack does not support adding undefined properties to HtmlRspackPlugin, so this code will throw an error!
					// ...(pluginArgs.plugin.options.skipAssets || []),
					// ...(pluginArgs.plugin.options.excludeAssets || []),
				];

				pluginArgs.headTags = this._skipAssets(pluginArgs.headTags, filters);
				pluginArgs.bodyTags = this._skipAssets(pluginArgs.bodyTags, filters);

				return pluginArgs;
			})
		});
  }

  private _skipAssets(
    assets: JsHtmlPluginTag[],
    matchers: AssetMatcher[]
  ): any[] {
    return assets.filter((a) => {
      const skipped = matchers.some((matcher) => {
        if (!matcher) {
          return false;
        }
        const assetUrl: string = (a.attributes.src ??
          a.attributes.href ??
          "") as string;
        if (typeof matcher === "string") {
          return minimatch(assetUrl, matcher);
        }
        if (matcher.constructor && matcher.constructor.name === "RegExp") {
          const regexMatcher = matcher as RegExp;
          return !!assetUrl.match(regexMatcher);
        }
        if (typeof matcher === "function") {
          const matchesCallback = matcher(a);
          return !!matchesCallback;
        }
        return false;
      });
      return !skipped;
    });
  }
}
