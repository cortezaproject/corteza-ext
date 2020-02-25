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
