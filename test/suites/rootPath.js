var ModelAPI = require("../../lib/model-api")();
var mongoose = require('mongoose');
var express = require('express');
var request = require("request");
var util = require("util");
var assert = require('assert');

var testPort = 30023;
var testUrl = 'http://localhost:' + testPort;

module.exports = exports = function (create, setup, dismantle) {
	
	var server; 
	var Person;
	var router;
	
	describe("Linking API with sub-router", function (done) {
		var app = create();	
		beforeEach(function (done) {
	        setup(function (err) {
	          if (err) {
	            return done(err);
	          }
	          router = express.Router();
	          Person = mongoose.models.Person;
		  	  ModelAPI.assign(router, "/api", "v1", "/admin");
			  ModelAPI.expose(Person);
			  ModelAPI.implement();
			  app.use("/admin", router);
			  server = app.listen(testPort, done);
	        });
		});

		afterEach(function (done) {
			delete router;
			dismantle(app, server, done);
		});
		
    	it("OPTIONS /api/v1 200 -- verifying root path", function (done) {
			request.post({
				url: util.format('%s/admin/api/v1', testUrl),
				headers: {
					"X-HTTP-Method-Override": "OPTIONS"
				}
			}, function (err, res, body) {
			    assert.ok(!err);
			    assert.equal(res.statusCode, 200);
			    if (typeof(body) == "string") {
			    	body = JSON.parse(body);
			    };
			    assert.equal(body.length, 8);
			    for (var i=0;i<body.length;i++) {
			    	var url = body[i][0].split(/\s+/g)[1];
			    	assert.equal(url.indexOf("/admin/api/v1"), 0);
			    }
			    done();
			});

		});
		
	});
};