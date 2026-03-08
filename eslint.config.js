const js = require('@eslint/js')

module.exports = [
    {
        ignores: ['node_modules/', 'build/', '.cache/']
    },
    {
        files: ['src/**/*.js'],
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: 'module',
            globals: {
                console: 'readonly',
                process: 'readonly',
                Buffer: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                require: 'readonly',
                module: 'readonly'
            }
        },
        rules: {
            ...js.configs.recommended.rules,
            'no-console': 'off',
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'no-underscore-dangle': 'off',
            'func-names': 'off',
            'object-shorthand': 'off',
            'prefer-arrow-callback': 'warn',
            'no-param-reassign': 'warn',
            'consistent-return': 'warn',
            'no-use-before-define': 'warn',
            'no-await-in-loop': 'warn',
            'no-restricted-syntax': 'warn',
            'guard-for-in': 'warn',
            'prefer-destructuring': 'warn'
        }
    }
]
