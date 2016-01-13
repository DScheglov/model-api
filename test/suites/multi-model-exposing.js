var ModelAPI = require("../../lib/model-api")();
var mongoose = require('mongoose');
var request = require("request");
var util = require("util");
var assert = require('assert');

var testPort = 30023;
var testUrl = 'http://localhost:' + testPort;

module.exports = exports = function (create, setup, dismantle) {
	
	var server; 
	var Person;

	describe("Multi model exposing", function (done) {
		var app = create();
		beforeEach(function (done) {
	        setup(function (err) {
	          
	          if (err) {
	            return done(err);
	          };
	          Person = mongoose.models.Person;
	          Book = mongoose.models.Book;
		  	  ModelAPI.assign(app, "/api", "v1");
			  ModelAPI.expose(Person, {});
			  ModelAPI.expose(Book, {});
			  ModelAPI.implement();
			  server = app.listen(testPort, done);
	        });
		});

		afterEach(function (done) {
			dismantle(app, server, done);
		});
    	  
    	  
    	it("OPTIONS /api/v1 200 -- get options for all API", function (done) {
			request.post({
				url: util.format('%s/api/v1', testUrl),
				headers: {
					"X-HTTP-Method-Override": "OPTIONS"
				}
			}, function (err, res, body) {
			    assert.ok(!err);
			    assert.equal(res.statusCode, 200);
			    if (typeof(body) == "string") {
			    	body = JSON.parse(body);
			    }
			    assert.equal(body.length, 15);
			    done();
			});

		});
		
		it("OPTIONS /api/v1/people 200 -- get options for People API", function (done) {

			request.post({
				url: util.format('%s/api/v1/people', testUrl),
				headers: {
					"X-HTTP-Method-Override": "OPTIONS"
				}
			}, function (err, res, body) {
		        assert.ok(!err);
		        assert.equal(res.statusCode, 200);
		        if (typeof(body) == "string") {
		        	body = JSON.parse(body);
		        }
		        assert.equal(body.length, 7);
		        done();
			});

		});

		it("OPTIONS /api/v1/books 200 -- get options for Books API", function (done) {

			request.post({
				url: util.format('%s/api/v1/books', testUrl),
				headers: {
					"X-HTTP-Method-Override": "OPTIONS"
				}
			}, function (err, res, body) {
		        assert.ok(!err);
		        assert.equal(res.statusCode, 200);
		        if (typeof(body) == "string") {
		        	body = JSON.parse(body);
		        }
		        assert.equal(body.length, 7);
		        done();
			});

		});
		
				
	});

};