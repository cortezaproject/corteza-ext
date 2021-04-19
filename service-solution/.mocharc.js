// SPDX-FileCopyrightText: 2020, Tomaž Jerman
// SPDX-License-Identifier: Apache-2.0

module.exports = {
  require: [
    'esm',
  ],
  'full-trace': true,
  bail: true,
  recursive: true,
  extension: ['.test.js'],
  spec: [
    'server-scripts/**/*.test.js',
    'client-scripts/**/*.test.js',
  ],
  'watch-files': [ 'src/**' ],
}
