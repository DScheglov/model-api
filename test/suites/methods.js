var ModelAPI = require("../../lib/model-api")();
var mongoose = require('mongoose');
var request = require("request");
var util = require("util");
var assert = require('assert');

var testPort = 30023;
var testUrl = 'http://localhost:' + testPort;

assert.include = function(container, item, message) {
	assert.notEqual(container.indexOf(item), -1, message);
}

module.exports = exports = function (create, setup, dismantle) {
	
	describe("Exposing methods explicitly", function (done) {
		var app = create();	
		var server; 
		var Person;  
	    before(function (done) {
	        setup(function (err) {
	          
	          if (err) {
	            return done(err)
	          }
	          Person = mongoose.models.Person;
		  	  ModelAPI.assign(app, "/api", "v1");
			  ModelAPI.expose(Person, {
				  expose: {
					  Reverse: "Reverse letters in firstName and in lastName of specified Person"
				  }
			  });
			  ModelAPI.implement();
			  server = app.listen(testPort, done);
	        });
	      });
	    
	      after(function (done) {
	          dismantle(app, server, done)
	      });
    	
	      it("OPTIONS /api/v1/people 200 -- should return url for the exposed method Reverse", function (done) {

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

			        assert.equal(body.length, 8);
			        var i;
			        for (i=0; i<body.length; i++) {
			        	if (body[i][0] == "post /api/v1/people/:id/reverse" && 
			        		body[i][1] == "Reverse letters in firstName and in lastName of specified Person") break;
			        }
			        assert.notEqual(i, body.length);
			        done();
				});
	      });
	      
	      it("POST /api/v1/people/:id/reverse 200 -- should reverse letters", function(done) {
				Person.findOne({}, function (err, p) {
					assert.ok(!err);
					assert.ok(p._id)
					request.post({
				        url: util.format('%s/api/v1/people/%s/reverse', testUrl, p._id)
				      }, function (err, res, body) {
				    	assert.ok(!err);  
				        assert.equal(res.statusCode, 200);
				        if (typeof(body) == "string") {
				        	body = JSON.parse(body);
				        }
				        assert.equal(body.status, "Ok");
				        Person.findById(p._id, function (err, p1) {
				        	assert.ok(!err);
					        assert.equal(p1.firstName, p.firstName.split("").reverse().join(""));
					        assert.equal(p1.lastName, p.lastName.split("").reverse().join(""));
					        done();
				        });
				    });
				});
			});
	      
			it("POST /api/v1/people/:id/reverse 404 -- try to call method Person by unexisting id -- should return 404", function(done) {
				var id = mongoose.Types.ObjectId();
				request.post({
			        url: util.format('%s/api/v1/people/%s/reverse', testUrl, id)
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
			
		    it("POST /api/v1/people/:id/to-upper-case 405 -- try to call unexposed method - should return 405", function(done) {
				Person.findOne({}, function (err, p) {
					assert.ok(!err);
					assert.ok(p._id)
					request.post({
				        url: util.format('%s/api/v1/people/%s/to-upper-case', testUrl, p._id)
				      }, function (err, res, body) {
				    	assert.ok(!err);  
				        assert.equal(res.statusCode, 405);
				        if (typeof(body) == "string") {
				        	body = JSON.parse(body);
				        }
				        assert.equal(body.error, "Not supported");
				        done();
				    });
				});
			});
	});

	describe("Exposing methods implicitly", function (done) {
		var app = create();	
		var server; 
		var Person;  
	    before(function (done) {
	        setup(function (err) {
	          
	          if (err) {
	            return done(err)
	          }
	          Person = mongoose.models.Person;
		  	  ModelAPI.assign(app, "/api", "v1");
			  ModelAPI.expose(Person, {
				  expose: {
					  "*": true
				  }
			  });
			  ModelAPI.implement();
			  server = app.listen(testPort, done);
	        });
	      });
	    
	      after(function (done) {
	          dismantle(app, server, done)
	      });
    	
	      it("OPTIONS /api/v1/people 200 -- should return urls for the exposed methods", function (done) {

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
			        assert.equal(body.length, 9);
			        var i;
			        var reverseExposed = false;
			        var toUpperCaseExposed = false;
			        for (i=0; i<body.length; i++) {
			        	reverseExposed = reverseExposed || (
			        			body[i][0] == "post /api/v1/people/:id/reverse" && 
			        			body[i][1] == "Person.Reverse"
			        	); 
			        	toUpperCaseExposed = toUpperCaseExposed || (
			        			body[i][0] == "post /api/v1/people/:id/to-upper-case" && 
			        			body[i][1] == "Person.toUpperCase"
			        	);
			        	if (reverseExposed && toUpperCaseExposed) break;
			        }
			        assert.ok(reverseExposed);
			        assert.ok(toUpperCaseExposed);
			        done();
				});
	      });
	      
	      it("POST /api/v1/people/:id/reverse 200 -- should reverse letters", function(done) {
				Person.findOne({}, function (err, p) {
					assert.ok(!err);
					assert.ok(p._id)
					request.post({
				        url: util.format('%s/api/v1/people/%s/reverse', testUrl, p._id)
				      }, function (err, res, body) {
				    	assert.ok(!err);  
				        assert.equal(res.statusCode, 200);
				        if (typeof(body) == "string") {
				        	body = JSON.parse(body);
				        }
				        assert.equal(body.status, "Ok");
				        Person.findById(p._id, function (err, p1) {
				        	assert.ok(!err);
					        assert.equal(p1.firstName, p.firstName.split("").reverse().join(""));
					        assert.equal(p1.lastName, p.lastName.split("").reverse().join(""));
					        done();
				        });
				    });
				});
			});
	      
	      it("POST /api/v1/people/:id/to-upper-case 200 -- should upper-case letters", function(done) {
				Person.findOne({}, function (err, p) {
					assert.ok(!err);
					assert.ok(p._id);
					assert.ok(!(/^[A-Z]+$/.test(p.firstName)));
					assert.ok(!(/^[A-Z]+$/.test(p.lastName)));
					request.post({
				        url: util.format('%s/api/v1/people/%s/to-upper-case', testUrl, p._id)
				      }, function (err, res, body) {
				    	assert.ok(!err);  
				        assert.equal(res.statusCode, 200);
				        if (typeof(body) == "string") {
				        	body = JSON.parse(body);
				        }
				        assert.equal(body.status, "Ok");
				        Person.findById(p._id, function (err, p1) {
				        	assert.ok(!err);
				        	assert.equal(p1._id.toString(), p._id.toString());
					        assert.equal(p1.firstName, p.firstName.toUpperCase());
					        assert.equal(p1.lastName, p.lastName.toUpperCase());
					        done();
				        });
				    });
				});
	      });
	});
	
	describe("Hiding methods explicitly", function (done) {
		var app = create();	
		var server; 
		var Person;  
	    before(function (done) {
	        setup(function (err) {
	          
	          if (err) {
	            return done(err)
	          }
	          Person = mongoose.models.Person;
		  	  ModelAPI.assign(app, "/api", "v1");
			  ModelAPI.expose(Person, {
				  expose: {
					  "*": true,
					  toUpperCase: false
				  }
			  });
			  ModelAPI.implement();
			  server = app.listen(testPort, done);
	        });
	      });
	    
	      after(function (done) {
	          dismantle(app, server, done)
	      });
    	
	      it("OPTIONS /api/v1/people 200 -- should not return url for the hidden method toUpperCase", function (done) {

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
			        assert.equal(body.length, 8);
			        var i;
			        var reverseExposed = false;
			        var toUpperCaseExposed = false;
			        for (i=0; i<body.length; i++) {
			        	reverseExposed = reverseExposed || (
			        			body[i][0] == "post /api/v1/people/:id/reverse" && 
			        			body[i][1] == "Person.Reverse"
			        	); 
			        	toUpperCaseExposed = toUpperCaseExposed || (
			        			body[i][0] == "post /api/v1/people/:id/to-upper-case" && 
			        			body[i][1] == "Person.toUpperCase"
			        	);
			        	if (reverseExposed && toUpperCaseExposed) break;
			        }
			        assert.ok(reverseExposed);
			        assert.ok(!toUpperCaseExposed);
			        done();
				});
	      });
	      
	      it("POST /api/v1/people/:id/reverse 200 -- should reverse letters", function(done) {
				Person.findOne({}, function (err, p) {
					assert.ok(!err);
					assert.ok(p._id)
					request.post({
				        url: util.format('%s/api/v1/people/%s/reverse', testUrl, p._id)
				      }, function (err, res, body) {
				    	assert.ok(!err);  
				        assert.equal(res.statusCode, 200);
				        if (typeof(body) == "string") {
				        	body = JSON.parse(body);
				        }
				        assert.equal(body.status, "Ok");
				        Person.findById(p._id, function (err, p1) {
				        	assert.ok(!err);
					        assert.equal(p1.firstName, p.firstName.split("").reverse().join(""));
					        assert.equal(p1.lastName, p.lastName.split("").reverse().join(""));
					        done();
				        });
				    });
				});
			});
	      
		    it("POST /api/v1/people/:id/to-upper-case 405 -- try to call hidden method - should return 405", function(done) {
				Person.findOne({}, function (err, p) {
					assert.ok(!err);
					assert.ok(p._id)
					request.post({
				        url: util.format('%s/api/v1/people/%s/to-upper-case', testUrl, p._id)
				      }, function (err, res, body) {
				    	assert.ok(!err);  
				        assert.equal(res.statusCode, 405);
				        if (typeof(body) == "string") {
				        	body = JSON.parse(body);
				        }
				        assert.equal(body.error, "Not supported");
				        done();
				    });
				});
			});
	});

	describe("Exposing static methods implicitly", function (done) {
		var app = create();	
		var server; 
		var Person;  
	    before(function (done) {
	        setup(function (err) {
	          
	          if (err) {
	            return done(err)
	          }
	          Person = mongoose.models.Person;
		  	  ModelAPI.assign(app, "/api", "v1");
			  ModelAPI.expose(Person, {
				  exposeStatic: {
					  "*": true
				  }
			  });
			  ModelAPI.implement();
			  server = app.listen(testPort, done);
	        });
	      });
	    
	      after(function (done) {
	          dismantle(app, server, done)
	      });
    	
	      it("OPTIONS /api/v1/people/ 200 -- should return urls for the exposed methods", function (done) {

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

			        assert.equal(body.length, 8);
			        var i;
			        var emailListExposed = false;
			        for (i=0; i<body.length && !emailListExposed; i++) {
			        	emailListExposed = (
			        			body[i][0] == "post /api/v1/people/email-list" && 
			        			body[i][1] == "Person.statics.emailList"
			        	); 
			        }
			        assert.ok(emailListExposed);
			        done();
				});
	      });
	      
	      it("POST /api/v1/people/email-list 200 -- should return an ordered email-list", function(done) {
				request.post({
			        url: util.format('%s/api/v1/people/email-list', testUrl)
			      }, function (err, res, body) {
			    	assert.ok(!err);  
			        assert.equal(res.statusCode, 200);
			        if (typeof(body) == "string") {
			        	body = JSON.parse(body);
			        }
			        assert.ok(body instanceof Array);
			        assert.equal(body.length, 4);
			        assert.deepEqual(body, ['t.shevchenko@heroes.ua',
			        					'a.s.pushkin@authors.ru',
			        					'jack.london@writers.uk',
			        					'm-twen@legends.us'].sort());
			        done();
			    });
		  });
	});
};