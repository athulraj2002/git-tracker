import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { StorybookConfig } from '@storybook/angular';
import type { Configuration, RuleSetRule } from 'webpack';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config: StorybookConfig = {
  stories: ['../**/*.@(mdx|stories.@(js|jsx|ts|tsx))'],
  addons: [],
  framework: {
    name: getAbsolutePath("@storybook/angular"),
    options: {},
  },
  webpackFinal: async (config: Configuration) => {
    config.module = config.module ?? { rules: [] };

    // Remove any existing CSS rules added by Storybook
    config.module.rules = (config.module.rules ?? []).filter((rule) => {
      if (rule && typeof rule === 'object' && 'test' in rule) {
        return !(rule as RuleSetRule).test?.toString().includes('css');
      }
      return true;
    });

    // Add postcss-loader so Tailwind v4 @import is processed correctly
    config.module.rules.push({
      test: /\.css$/,
      use: [
        'style-loader',
        'css-loader',
        {
          loader: 'postcss-loader',
          options: {
            postcssOptions: {
              config: resolve(__dirname, '../../../postcss.config.js'),
            },
          },
        },
      ],
    });

    return config;
  },
};

export default config;

function getAbsolutePath(value: string): any {
  return dirname(fileURLToPath(import.meta.resolve(`${value}/package.json`)));
}
