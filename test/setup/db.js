var async = require('async')
var mongoose = require('mongoose')
var util = require('util')
var dbName = mongoose.Types.ObjectId();
var people = require("./fixtures/people");

var schemas = require('./schemas').schemas;

module.exports = function () {
  

  function initialize (callback) {
    mongoose.connect('mongodb://localhost/db'+dbName, callback)
  }

  function reset (callback) {
    async.series([
      function (cb) {
    	  mongoose.model("Person", schemas.Person).collection.insert(people, cb);
      },
      function (cb) {
    	  mongoose.model("Book", schemas.Book);
    	  cb();
      }
    ], callback)
  }

  function close (callback) {
	mongoose.connection.db.dropDatabase();
    mongoose.connection.close(callback);
  }

  return {
    initialize: initialize,
    reset: reset,
    close: close
  }
}
