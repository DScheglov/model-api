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


	describe("Common fields restrictios for list and instance", function (done) {
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
				  fields: {
					  _id: false,
					  firstName: true,
					  email: true
				  }
			  });
			  ModelAPI.implement();
			  server = app.listen(testPort, done);
	        });
	      });
	    
	      after(function (done) {
	          dismantle(app, server, done)
	      });
    	  
    	  it("Get all people and check fields", function (done) {
			request.get({
				url: util.format('%s/api/v1/people', testUrl),
			}, function (err, res, body) {
			    assert.ok(!err);
			    assert.equal(res.statusCode, 200);
			    if (typeof(body) == "string") {
			    	body = JSON.parse(body);
			    }
			    
			    var i = body.length;
			    var keys;
			    assert.equal(i, 4);
			    while (i--) {
			    	keys = Object.keys(body[i]);			    	
			    	assert.equal(keys.length, 2);			    	
			    	assert.include(keys, "firstName");
			    	assert.include(keys, "email");
			    }
			    done();
			});

		});
    	  
		it("Get a specific Person and check fields", function(done) {
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
			        assert.equal(body.email, p.email.toLowerCase());
			    	var keys = Object.keys(body);			    	
			    	assert.equal(keys.length, 2);			    	
			    	assert.include(keys, "firstName");
			    	assert.include(keys, "email");
			        done();
			    });
			});
		});
		
	});
	
	describe("Separate fields restrictios for list and instance", function (done) {
		var app = create();	
		var server; 
		var Person;
	    before(function (done) {
	        setup(function (err) {
	          
	          Person = mongoose.models.Person;
		  	  ModelAPI.assign(app, "/api", "v1");
			  ModelAPI.expose(Person, {
				  fields: {
					  _id: false,
					  firstName: true,
					  email: true
				  },
				  listFields: {
					  lastName: true
				  }
			  });
			  ModelAPI.implement();

			  server = app.listen(testPort, done);
	        });
	      });
	    
	      after(function (done) {
	          dismantle(app, server, done)
	      });
    	  
    	  it("Get all people and check fields", function (done) {
			request.get({
				url: util.format('%s/api/v1/people', testUrl),
			}, function (err, res, body) {
			    assert.ok(!err);
			    assert.equal(res.statusCode, 200);
			    if (typeof(body) == "string") {
			    	body = JSON.parse(body);
			    }
			    
			    var i = body.length;
			    var keys;
			    assert.equal(i, 4);
			    while (i--) {
			    	keys = Object.keys(body[i]);	
			    	assert.equal(keys.length, 2);			    	
			    	assert.include(keys, "_id");
			    	assert.include(keys, "lastName");
			    }
			    done();
			});

		});
    	  
		it("Get a specific Person and check fields", function(done) {
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
			        assert.equal(body.email, p.email.toLowerCase());
			    	var keys = Object.keys(body);			    	
			    	assert.equal(keys.length, 2);			    	
			    	assert.include(keys, "firstName");
			    	assert.include(keys, "email");
			        done();
			    });
			});
		});
		
	});
	
	describe("Restrictions for search by certain fields", function (done) {
		var app = create();	
		var server; 
		var Person;
	    before(function (done) {
	        setup(function (err) {
	          
	          Person = mongoose.models.Person;
		  	  ModelAPI.assign(app, "/api", "v1");
			  ModelAPI.expose(Person, {
				  queryFields: {
					  firstName: true
				  }
			  });
			  ModelAPI.implement();

			  server = app.listen(testPort, done);
	        });
	      });
	    
	      after(function (done) {
	          dismantle(app, server, done)
	      });
    	  
    	  it("Searching by the allowed field - should return one result)", function (done) {
			request.post({
				url: util.format('%s/api/v1/people/search', testUrl),
				json: {
					firstName: "Taras"
				}
			}, function (err, res, body) {
			    assert.ok(!err);
			    assert.equal(res.statusCode, 200);
			    if (typeof(body) == "string") {
			    	body = JSON.parse(body);
			    }
			    
			    assert.equal(body.length, 1);
		        assert.equal(body[0].firstName, "Taras");
		        assert.equal(body[0].lastName, "Shevchenko");
		        assert.equal(body[0].email, "t.shevchenko@heroes.ua");
			    done();
			});

		});
    	  
    	it("Searching by the not allowed field - should ignore not allowed fields and return all the people", function (done) {
  			request.post({
  				url: util.format('%s/api/v1/people/search', testUrl),
  				json: {
  					lastName: "Shevchenko"
  				}
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
		
	});
	
	describe("Restrictions for sorting by certain fields", function (done) {
		var app = create();	
		var server; 
		var Person;
	    before(function (done) {
	        setup(function (err) {
	          
	          Person = mongoose.models.Person;
		  	  ModelAPI.assign(app, "/api", "v1");
			  ModelAPI.expose(Person, {
				  sortFields: {
					  email:true
				  }
			  });
			  ModelAPI.implement();

			  server = app.listen(testPort, done);
	        });
	      });
	    
	      after(function (done) {
	          dismantle(app, server, done)
	      });
    	  
    	  it("Should return results ordered by email (allowed for sorting) ascending", function (done) {
			request.get({
				url: util.format('%s/api/v1/people?_sort=email', testUrl)
			}, function (err, res, body) {
			    assert.ok(!err);
			    assert.equal(res.statusCode, 200);
			    if (typeof(body) == "string") {
			    	body = JSON.parse(body);
			    }
			    
			    assert.equal(body.length, 4);
			    for (var i=1;i<body.length;i++) {
			    	assert.ok(body[i].email >= body[i-1].email);
			    }
			    done();
			});

		});

    	it("Should return results ordered by email (allowed for sorting) descending", function (done) {
  			request.get({
  				url: util.format('%s/api/v1/people?_sort=-email', testUrl)
  			}, function (err, res, body) {
  			    assert.ok(!err);
  			    assert.equal(res.statusCode, 200);
  			    if (typeof(body) == "string") {
  			    	body = JSON.parse(body);
  			    }
  			    
  			    assert.equal(body.length, 4);
  			    for (var i=1;i<body.length;i++) {
  			    	assert.ok(body[i].email <= body[i-1].email);
  			    }
  			    done();
  			});

  		});
    	
    	it("Should return unsorted results while trying to sort by not allowed for sorting field", function (done) {
  			request.get({
  				url: util.format('%s/api/v1/people?_sort=firstName', testUrl)
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
  			    	asc = asc || (body[i].firstName > body[i-1].firstName);
  			    	desc = desc || (body[i].firstName < body[i-1].firstName);
  			    }
  			    assert.ok(asc);
  			    assert.ok(desc);
  			    done();
  			});

  		});
    	
    	it("Should return unsorted results while sort options is not specified", function (done) {
  			request.get({
  				url: util.format('%s/api/v1/people', testUrl)
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

	describe("Sorting, limiting and skiping with get method", function (done) {
		var app = create();	
		var server; 
		var Person;
	    before(function (done) {
	        setup(function (err) {
	          
	          Person = mongoose.models.Person;
		  	  ModelAPI.assign(app, "/api", "v1");
			  ModelAPI.expose(Person, {
				  sortFields: {
					  email:true
				  },
				  searchMethod: "get"
			  });
			  ModelAPI.implement();

			  server = app.listen(testPort, done);
	        });
	      });
	    
	      after(function (done) {
	          dismantle(app, server, done)
	      });
    	  
    	  it("Should return results ordered by email (allowed for sorting) ascending", function (done) {
			request.get({
				url: util.format('%s/api/v1/people?_sort=email&firstName=Taras', testUrl)
			}, function (err, res, body) {
			    assert.ok(!err);
			    assert.equal(res.statusCode, 200);
			    if (typeof(body) == "string") {
			    	body = JSON.parse(body);
			    }
			    
			    assert.equal(body.length, 1);
			    done();
			});

		});
		
	});
	
};