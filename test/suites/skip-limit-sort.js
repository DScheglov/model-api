var ModelAPI = require("../../lib/model-api");
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


	describe("Skip and limit allowed", function (done) {
		var app = create();	
		var server; 
		var Person;  
	    before(function (done) {
	        setup(function (err) {
	          
	          if (err) {
	            return done(err)
	          }
	          Person = mongoose.models.Person;
		  	  ModelAPI.assign(app);
			  ModelAPI.expose(Person);
			  ModelAPI.implement();
			  server = app.listen(testPort, done);
	        });
	      });
	    
	      after(function (done) {
	          dismantle(app, server, done)
	      });
    	  
    	it("Get all people without limitation", function (done) {
			request.get({
				url: util.format('%s/api/v1/people', testUrl),
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
    	
    	it("Get all people and limit the result with 2 reecords", function (done) {
			request.get({
				url: util.format('%s/api/v1/people?_limit=2', testUrl),
			}, function (err, res, body) {
			    assert.ok(!err);
			    assert.equal(res.statusCode, 200);
			    if (typeof(body) == "string") {
			    	body = JSON.parse(body);
			    };
			    assert.equal(body.length, 2);
			    done();
			});
		
    	});
    	
    	it("Get all people, limit the result with 2 reecords and skip 1 record", function (done) {
			request.get({
				url: util.format('%s/api/v1/people?_limit=2&_skip=1&_sort=email', testUrl),
			}, function (err, res, body) {
			    assert.ok(!err);
			    assert.equal(res.statusCode, 200);
			    if (typeof(body) == "string") {
			    	body = JSON.parse(body);
			    };
			    assert.equal(body.length, 2);
			    Person.find().sort("email").skip(1).limit(2).exec(function (err, people){
			    	assert.ok(!err);
			    	assert.equal(people.length, 2);
			    	for(var i=0; i<people.length; i++) {
			    		assert.equal(people[i]._id, body[i]._id);
			    	};
			    	done();
			    });
			    
			});
		
    	});
	
	});
	
	describe("Limitation disabled", function (done) {
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
				  limitAllowed: false
			  });
			  ModelAPI.implement();
			  server = app.listen(testPort, done);
	        });
	      });
	    
	      after(function (done) {
	          dismantle(app, server, done)
	      });
    	
    	it("Get all people and try limit the result with 2 reecords - should return 4 records", function (done) {
			request.get({
				url: util.format('%s/api/v1/people?_limit=2', testUrl),
			}, function (err, res, body) {
			    assert.ok(!err);
			    assert.equal(res.statusCode, 200);
			    if (typeof(body) == "string") {
			    	body = JSON.parse(body);
			    };
			    assert.equal(body.length, 4);
			    done();
			});
		
    	});
    	
    	it("Get all people, try to limit the result with 2 reecords and skip 1 record - should return 3 records", function (done) {
			request.get({
				url: util.format('%s/api/v1/people?_limit=2&_skip=1&_sort=email', testUrl),
			}, function (err, res, body) {
			    assert.ok(!err);
			    assert.equal(res.statusCode, 200);
			    if (typeof(body) == "string") {
			    	body = JSON.parse(body);
			    };
			    assert.equal(body.length, 3);
			    Person.find().sort("email").skip(1).limit(2).exec(function (err, people){
			    	assert.ok(!err);
			    	assert.equal(people.length, 2);
			    	for(var i=0; i<2; i++) {
			    		assert.equal(people[i]._id, body[i]._id);
			    	};
			    	done();
			    });
			    
			});
		
    	});
	
	});
	
	describe("Skipping disabled", function (done) {
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
				  skipAllowed: false
			  });
			  ModelAPI.implement();
			  server = app.listen(testPort, done);
	        });
	      });
	    
	      after(function (done) {
	          dismantle(app, server, done)
	      });
    	
    	it("Get all people, try to skip 1 record - should return 4 records", function (done) {
			request.get({
				url: util.format('%s/api/v1/people?_skip=1&_sort=email', testUrl),
			}, function (err, res, body) {
			    assert.ok(!err);
			    assert.equal(res.statusCode, 200);
			    if (typeof(body) == "string") {
			    	body = JSON.parse(body);
			    };
			    assert.equal(body.length, 4);
			    Person.find().sort("email").exec(function (err, people){
			    	assert.ok(!err);
			    	assert.equal(people.length, 4);
			    	for(var i=0; i<people.length; i++) {
			    		assert.equal(people[i]._id, body[i]._id);
			    	};
			    	done();
			    });
			    
			});
		
    	});
	
	});
	
	describe("Sorting disabled", function (done) {
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
				  sortAllowed: false
			  });
			  ModelAPI.implement();
			  server = app.listen(testPort, done);
	        });
	      });
	    
	      after(function (done) {
	          dismantle(app, server, done)
	      });
    	
    	it("Get all people, try to sort by email - should return unsorted list", function (done) {
  			request.get({
  				url: util.format('%s/api/v1/people?_sort=email', testUrl)
  			}, function (err, res, body) {
  			    assert.ok(!err);
  			    assert.equal(res.statusCode, 200);
  			    if (typeof(body) == "string") {
  			    	body = JSON.parse(body);
  			    }
  			    
  			    assert.equal(body.length, 4);
  			    var asc = false;
  			    var desc = false;
  			    for (var i=1;i<body.length;i++) {
  			    	asc = asc || (body[i].email > body[i-1].email);
  			    	desc = desc || (body[i].email < body[i-1].email);
  			    }
  			    assert.ok(asc);
  			    assert.ok(desc);
  			    done();
  			});
		
    	});
	
	});
	
};