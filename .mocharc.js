module.exports = {
  require: [
    'esm',
  ],
  'full-trace': true,
  bail: true,
  recursive: true,
  extension: ['.test.js'],
  spec: 'src/**/*.test.js',
  'watch-files': [ 'src/**' ],
}
