const express = require('express');
const path = require('path');

module.exports = () => {
  const app = express();
  app.use((req, res, next) => {
    res.set('Access-Control-Allow-Origin', '*');
    next();
  });
  app.use('/', express.static(path.join(__dirname, '../', '../')));

  // Choose a random, free port
  const server = app.listen(0, () => console.log('Tests static server listening on port ' + server.address().port));
  return server;
}
