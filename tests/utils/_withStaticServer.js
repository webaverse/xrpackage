const express = require('express');
const path = require('path');
module.exports = () => {
  const app = express();
  app.use((req, res, next) => {
    res.set('Access-Control-Allow-Origin', '*');
    next();
  });
  const server = app.listen(0, () => console.log('Tests static server listening on port ' + server.address().port));

  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, '../', 'static/views'));
  app.use('/', express.static(path.join(__dirname, '../', '../')));

  // Choose a random, free port
  app.get(`/tests/static/`, (req, res) => {
    const url = `${req.protocol}://${req.get('host')}/xrpackage.js`;
    res.render(`index`, {url: url});
  })
  return server;
}
