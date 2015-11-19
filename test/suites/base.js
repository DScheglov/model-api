var ModelAPI = require("../../lib/model-api");
var mongoose = require('mongoose');
var request = require("request");
var util = require("util");
var assert = require('assert');

var testPort = 30023;
var testUrl = 'http://localhost:' + testPort;

module.exports = exports = function (create, setup, dismantle) {
	var app = create();	
	var server; 
	var Person;
	
    beforeEach(function (done) {
        setup(function (err) {
          
          if (err) {
            return done(err)
          }
          Person = mongoose.models.Person;
	  	  ModelAPI.assign(app, "/api", "v1");
		  ModelAPI.expose(Person, {});
		  ModelAPI.implement();
		  app.use(function (err) {
			  
		  });
		  server = app.listen(testPort, done);
		  //done();
        });
      });

      afterEach(function (done) {
        dismantle(app, server, done)
      })

      describe("Simplest API use. Rest Full", function (done) {
    	  
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
			    assert.equal(body.length, 8);
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
		
		it("POST /api/v1/people 201 -- create a Person", function (done){
			request.post({
		        url: util.format('%s/api/v1/people', testUrl),
		        json: {
		          firstName: 'John',
		          lastName: 'Johnson',
		          email: "john.johnson@i.ua"
		        }
		      }, function (err, res, body) {
		        assert.ok(!err);
		        assert.equal(res.statusCode, 201);
		        assert.ok(body._id);
		        assert.equal(body.firstName, 'John');
		        assert.equal(body.lastName, 'Johnson');
		        assert.equal(body.email, "john.johnson@i.ua");
		        Person.count(function(err, res) {			        	
		        	assert.equal(res, 5);
		        	done();
		        });
		      });
		});
		
		it("POST /api/v1/people 422 -- posting invalid data while creating a Person", function (done){
			request.post({
		        url: util.format('%s/api/v1/people', testUrl),
		        json: {
		          firstName: 'John',
		          email: "john.johnson@i.ua"
		        }
		      }, function (err, res, body) {
		    	assert.ok(!err);  
		        assert.equal(res.statusCode, 422);
		        assert.equal(body.error, "Person validation failed");
		        done();
		      });
		});
		
		it("GET /api/v1/people 200 -- get all people", function(done) {
			request.get({
		        url: util.format('%s/api/v1/people', testUrl)		        
		      }, function (err, res, body) {
		    	assert.ok(!err);  
		        assert.equal(res.statusCode, 200);
		        if (typeof(body) == "string") {
		        	body = JSON.parse(body);
		        }
		        assert.equal(body.length, 4);
		        done();
		      });
		});
		
		it("GET /api/v1/people/:id 200 -- get a specific Person", function(done) {
			Person.findOne({}, function (err, p) {
				assert.ok(!err);
				assert.ok(p._id)
				request.get({
			        url: util.format('%s/api/v1/people/%s', testUrl, p._id)		        
			      }, function (err, res, body) {
			    	assert.ok(!err);  
			        assert.equal(res.statusCode, 200);
			        if (typeof(body) == "string") {
			        	body = JSON.parse(body);
			        }
			        assert.equal(body.firstName, p.firstName);
			        assert.equal(body.lastName, p.lastName);
			        assert.equal(body.fullName, p.fullName);
			        assert.equal(body.email, p.email.toLowerCase());
			        done();
			    });
			});
		});
		
		it("POST /api/v1/people/:id 200 -- update a specific Person", function(done) {
			Person.findOne({}, function (err, p) {
				assert.ok(!err);
				assert.ok(p._id)
				request.post({
			        url: util.format('%s/api/v1/people/%s', testUrl, p._id),
			        json: {
			        	email: "new.mail@server.com"
			        }
			      }, function (err, res, body) {
			    	assert.ok(!err);  
			        assert.equal(res.statusCode, 200);
			        if (typeof(body) == "string") {
			        	body = JSON.parse(body);
			        }
			        assert.equal(body.firstName, p.firstName);
			        assert.equal(body.lastName, p.lastName);
			        assert.equal(body.fullName, p.fullName);
			        assert.equal(body.email, "new.mail@server.com");
			        Person.findById(p._id, function (err, p1) {
			        	assert.ok(!err);
				        assert.equal(p1.firstName, p.firstName);
				        assert.equal(p1.lastName, p.lastName);
				        assert.equal(p1.fullName, p.fullName);
				        assert.equal(p1.email, "new.mail@server.com");
				        done();
			        });
			    });
			});
		});
		
		it("DELETE /api/v1/people/:id 200", function(done) {
			Person.findOne({}, function (err, p) {
				assert.ok(!err);
				assert.ok(p._id)
				request.post({
			        url: util.format('%s/api/v1/people/%s', testUrl, p._id),
					headers: {
						"X-HTTP-Method-Override": "DELETE"
					}
			      }, function (err, res, body) {
			    	assert.ok(!err);  
			        assert.equal(res.statusCode, 200);
			        if (typeof(body) == "string") {
			        	body = JSON.parse(body);
			        }
			        assert.equal(body.status, "Ok");
			        Person.count(function(err, res) {			        	
			        	assert.equal(res, 3);
			        	done();
			        });
			    });
			});
		});
		
		it("GET /api/v1/people/:id 404 -- try to get Person by unexisting id", function(done) {
			var id = mongoose.Types.ObjectId();
			request.get({
		        url: util.format('%s/api/v1/people/%s', testUrl, id)		        
		      }, function (err, res, body) {
		    	assert.ok(!err);  
		        assert.equal(res.statusCode, 404);
		        if (typeof(body) == "string") {
		        	body = JSON.parse(body);
		        }
		        assert.equal(body.error, "Not found");
		        done();
		    });
		});

		it("POST /api/v1/people/:id 404 -- try to update Person by unexisting id", function(done) {
			var id = mongoose.Types.ObjectId();
			request.post({
		        url: util.format('%s/api/v1/people/%s', testUrl, id),
		        json: {
		        	email: "new.mail@server.com"
		        }
		      }, function (err, res, body) {
		    	assert.ok(!err);  
		        assert.equal(res.statusCode, 404);
		        if (typeof(body) == "string") {
		        	body = JSON.parse(body);
		        }
		        assert.equal(body.error, "Not found");
		        done();
		    });
		});
		
		it("DELETE /api/v1/people/:id 404 -- try to delete Person by unexisting id", function(done) {
			var id = mongoose.Types.ObjectId();
			request.post({
		        url: util.format('%s/api/v1/people/%s', testUrl, id),
				headers: {
					"X-HTTP-Method-Override": "DELETE"
				}        
		      }, function (err, res, body) {
		    	assert.ok(!err);  
		        assert.equal(res.statusCode, 404);
		        if (typeof(body) == "string") {
		        	body = JSON.parse(body);
		        }
		        assert.equal(body.error, "Not found");
		        done();
		    });
		});
		
	});
}