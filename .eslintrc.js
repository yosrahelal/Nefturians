module.exports = {
  env: {
    browser: false,
    es2021: true,
    mocha: true,
    node: true
  },
  extends: [
    'standard',
    'plugin:node/recommended'
  ],
  parserOptions: {
    ecmaVersion: 12
  },
  overrides: [
    {
      files: ['hardhat.config.js'],
      globals: { task: true }
    },
    {
      files: ['*.test.js', '*.spec.js'],
      rules: {
        'no-unused-expressions': 'off'
      }
    }
  ],
  rules: {
    semi: [2, 'always'],
    'space-before-function-paren': ['error', {
      named: 'never',
      anonymous: 'never',
      asyncArrow: 'always'
    }],
    'new-cap': ['error', {
      newIsCap: false
    }]
  }
};
