const express = require('express');
const path = require('path');
const app = express();
const port = 3000;

module.exports = () => {
  app.use((req, res, next) => {
    res.set('Access-Control-Allow-Origin', '*');
    next();
  });
  app.use(express.static(path.join(__dirname, '../', '../')));
  return app.listen(port, () => console.log('Tests static server listening on port ' + port));
}
