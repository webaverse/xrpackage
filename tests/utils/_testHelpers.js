const withStaticServer = require('./_withStaticServer');

const _getStaticUrl = port => process.env.STATIC_URL.replace('{port}', port);

const testBeforeHook = t => {
  const server = withStaticServer();
  const port = server.address().port;

  t.context.staticUrl = _getStaticUrl(port);
  t.context.server = server;
  t.context.port = port;
};

const testAfterHook = t => t.context.server.close();

module.exports = {
  testBeforeHook,
  testAfterHook,
};
