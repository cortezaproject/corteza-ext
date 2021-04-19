// SPDX-FileCopyrightText: 2020, Tomaž Jerman
// SPDX-License-Identifier: Apache-2.0

module.exports = {
  require: [
    'esm',
    'ts-node/register',
    'source-map-support/register',
  ],
  'full-trace': true,
  bail: true,
  recursive: true,
  extension: ['ts', 'js'],
  spec: 'src/**/*.test.ts',
  'watch-files': [ 'src/**' ],
}
