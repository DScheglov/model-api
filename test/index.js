var express = require('express');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');

var api = require('../lib/model-api');
var db = require('./setup/db')()

function ModelAPI () {
  var app = express();
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(methodOverride());
  return app;
}

function setup (callback) {
  db.initialize(function (err) {
    if (err) {
      return callback(err)
    }

    db.reset(callback)
  })
}

function dismantle (app, server, callback) {
  db.close(function (err) {
    if (err) {
      return callback(err)
    }

    if (app.close) {
      return app.close(callback)
    }

    server.close(callback)
  })
}

function runTests (createFn) {
  describe(createFn.name, function () {
	  require('./suites/base')(createFn, setup, dismantle);
	  require('./suites/fields-restrictions')(createFn, setup, dismantle);
	  require('./suites/skip-limit-sort')(createFn, setup, dismantle);
	  require('./suites/methods')(createFn, setup, dismantle);
  })
}

runTests(ModelAPI);