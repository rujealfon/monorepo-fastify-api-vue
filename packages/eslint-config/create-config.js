import antfu from '@antfu/eslint-config'

const defaultIgnores = ['dist/**', 'migrations/**', '**/*.md', '**/package.json', '**/tsconfig.json']

export default function createConfig(options = {}, ...userConfigs) {
  const { ignores = [], ...antfuOptions } = options

  return antfu({
    type: 'app',
    typescript: true,
    formatters: {
      css: true,
      html: true,
      markdown: 'prettier',
    },
    stylistic: true,
    // stylistic: {
    //   indent: 2,
    //   semi: true,
    //   quotes: 'double',
    // },
    ...antfuOptions,
    ignores: [...defaultIgnores, ...ignores],
  }, {
    rules: {
      // 'antfu/no-top-level-await': 'off',
      // 'node/prefer-global/process': 'off',
      // 'ts/no-redeclare': 'off',
      'no-console': ['warn'],
      'node/no-process-env': ['error'],
      'ts/consistent-type-definitions': ['error', 'type'],
      'perfectionist/sort-imports': ['error', {
        tsconfigRootDir: '.',
      }],
      'unicorn/filename-case': ['error', {
        case: 'kebabCase',
        ignore: [/\.md$/],
      }],
    },
  }, {
    files: ['**/*.d.ts'],
    rules: {
      'ts/consistent-type-definitions': ['error', 'interface'],
    },
  }, ...userConfigs)
}
