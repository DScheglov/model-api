var extend = require('util')._extend;

/**
 * @param app
 * @returns {Function}
 */
function mapClosure(app) {
	function map(a, route){
	  route = route || '';
	  for (var key in a) {
	    switch (typeof a[key]) {
	      // { '/path': { ... }}
	      case 'object':
	        map(a[key], route + key);
	        break;
	      // get: function(){ ... }
	      case 'function':
	        app[key](route, a[key]);
	        break;
	    }
	  }
	};
	return map;
}

/**
 * @param model
 * @param options
 */
function ModelAPI(model, options) {
	options = options || {};
	this.model = model;
	this.filter = options.filter || null;
	this.nameSingle = options.apiName || model.modelName; 
	this.nameSingleURI = camel2giffen(this.nameSingle);
	this.plural = options.plural || model.collection.name; 
	this.pluralURI = camel2giffen(this.plural);
	model.apiObject = this;
	if (options && typeof(options) == 'object') {

		this.options = {
			rest: extend({}, ModelAPI.defaults.options.rest),
			expose: extend({}, ModelAPI.defaults.options.expose),
			exposeStatic: extend({}, ModelAPI.defaults.options.exposeStatic),
			fields: options.fields || ModelAPI.defaults.options.fields,
			listFields: options.listFields || options.fields || ModelAPI.defaults.options.listFields,			
			queryFields: options.queryFields || ModelAPI.defaults.options.queryFields,
			orderFields: options.orderFields || ModelAPI.defaults.options.orderFields,
			searchMethod: options.searchMethod || ModelAPI.defaults.options.searchMethod,
			skipAllowed: options.skipAllowed || ModelAPI.defaults.options.skipAllowed,
			limitAllowed: options.limitAllowed || ModelAPI.defaults.options.limitAllowed,
			populate: options.populate || ModelAPI.defaults.options.populate
		};
	
		this.options.rest = extend(this.options.rest, options.rest);
		this.options.expose = extend(this.options.expose, options.expose);
		this.options.exposeStatic = extend(this.options.exposeStatic, options.exposeStatic);

	} else {
		this.options = ModelAPI.defaults.options;
	}
}
ModelAPI.urls = [];
ModelAPI.map = {
	options: function(req, res, next) {		
		res.send([['options '+ModelAPI.path, 'List all API options.']].concat(ModelAPI.urls));
	}
};
ModelAPI.defaults = {
	url: "/api",
	version: "/v1",
	options: {
		rest: {
			list: true,
			create: true,
			search: true,
			findById: true,
			updateById: true,
			delById: true
		},
		expose: {
			'*': false
		},
		exposeStatic: {
			'*': false
		},
		
		listFields: {},
		instanceFields: {},		
		queryFields: null,
		orderFields: null,
		
		popuplate: null,
		listPopulate: null,
		
		searchMethod: 'post',
		skipAllowed: true,
		limitAllowed: true
	}	
};


function buildQuery(req, restMethod) {
	var method = this.options.searchMethod.toLowerCase();
	var query = {};
	if (restMethod == 'search') {
		query = (method == "post") ? req.body : req.query;
		if (this.options.queryFields) {
			var keys = Object.keys(query);
			var i = keys.length;
			while (i--) {
				if (!this.options.queryFields[key[i]]) delete query[key[i]];
			}
		}
	};
	var skip = this.options.skipAllowed && req.query._skip; 
	var limit = this.options.limitAllowed && req.query._limit;
	var fields = this.options.listFields;
	extend(query, this.filter);
	var dbQuery = this.model.find(query, fields);
	if (skip) {
		dbQuery = dbQuery.skip(skip);
	}
	if (limit) {
		dbQuery = dbQuery.limit(limit);
	}
	if (this.options.listPopulate) {
		dbQuery = dbQuery.populate(this.options.listPopulate);
	}
	return dbQuery;
}

ModelAPI.assign = function (expressApp, url, version) {
	this.url = url || ModelAPI.defaults.url;
	this.version = version || ModelAPI.defaults.version;
	this.path = this.url + (this.version.indexOf("/")==0?"":"/")+this.version;
	this.expressApp = expressApp;
	this.mapper = mapClosure(expressApp);
	return this;
}

ModelAPI.implement = function(urlMapping) {
	var map = {};
	map[this.path] = urlMapping || this.map; 
	this.mapper(map);
	return this;
}

ModelAPI.expose = function (model, options) {
	var modelAPI = model;
	if (!(modelAPI instanceof ModelAPI)) {
		modelAPI = new ModelAPI(model, options);
	}
	modelAPI.map(ModelAPI.map);
	ModelAPI.urls = ModelAPI.urls.concat(modelAPI.urls); 
	return ModelAPI;
}

ModelAPI.prototype.list = function (req, res, next) {
	
	buildQuery.call(this, req, "list").exec(function (err, obj) {
		if (err) return next(err);
		res.send(obj);
	});
	
};

ModelAPI.prototype.search = function (req, res, next) {
	
	buildQuery.call(this, req, "search").exec(function (err, obj) {
		if (err) return next(err);
		res.send(obj);
	});
	
};

ModelAPI.prototype.create = function (req, res, next) {
	var self = this;
	if (req.body._id) {
		res.statusCode = 401;
		var msg = "Use post ~/"+this.pluralURI+"/"+req.body._id+" to update a(n) "+this.nameSingle;
		return res.send({error: msg});
	}
	var obj = new (this.model)(req.body);
	obj.save(function (err) {
		if (err) {
			res.statusCode = 422;
			return res.send({error: err.message});
		}
		req.params.id = obj._id;
		res.statusCode = 201;
		return self.findById(req, res, next);
    });
};

ModelAPI.prototype.findById = function (req, res, next) {
	var id = req.params.id;
	var fields = this.options.fields;
	var populate = this.options.populate;
	var query = extend({_id: id}, this.filter);
	var dbQuery = this.model.findOne(query, fields);
	
	if (populate) {
		dbQuery = dbQuery.populate(populate);
	}
	
	dbQuery.exec(function (err, obj) {
		if (err) return next(err);
		if (!obj) {
			res.statusCode = 404;
            return res.send({ error: 'Not found' });
		}
		res.send(obj);
		
	});			
}

ModelAPI.prototype.updateById = function (req, res, next) {
	var self = this;
	var id = req.params.id;
	var query = extend({_id: id}, this.filter);
	this.model.findOneAndUpdate(query, {$set: req.body}, {'new':true})
		.exec(function(err, obj) {
			if (err) return next(err);
			if (!obj) {
				res.statusCode = 404;
	            return res.send({ error: 'Not found' });
			}
			return self.findById(req, res, next);			
		});
}

ModelAPI.prototype.delById = function (req, res, next) {
	var id = req.params.id;
	this.model.remove({_id: id})
		.exec(function(err, affected) {
			if (err) return next(err);
			if (affected.result.n == 0) {
				res.statusCode = 404;
	            return res.send({ error: 'Not found' });
			}
			if (affected.result.n > 0) {
				return res.send({ 'status': "Ok"});
			}			
		});
}

ModelAPI.prototype.callInstanceMethod = function(method, req, res, next) {
	var query = extend({_id: req.params.id}, this.filter);
	this.model.findById(query, function (err, obj) {
		if (err) return next(err);
		if (!obj) {
			res.statusCode = "404";
			res.send({error: "Not found"});
		};
		mFunc = obj[method]; 
		mFunc.call(obj, req.body, function(err, obj) {
			if (err) next(err);
			res.send(obj);
		});
	});
}

function notSupported(req, res, next) {
	res.statusCode = "405";
	res.send({error: "Not supported"});
};

ModelAPI.prototype.map = function (map) {
	var self = this;
	var localMap = {};
	var instanceMap = {};
	var rest = this.options.rest;
	this.urls = [];
	var basePath = ModelAPI.path + "/"+this.pluralURI; 
	
	localMap.options = function(req, res, next) {
		res.send(self.urls);
	};
	this.urls.push(["options "+basePath, "List API-options for "+this.plural]);
	
	if (rest.list) {
		localMap.get = function (req, res, next) { return self.list(req, res, next); };
		this.urls.push(["get "+basePath,  "List all "+this.plural]);
	} else {
		localMap.get = notSupported;
	}
	
	
	if (rest.search) {
		var method = this.options.searchMethod.toLowerCase();
		localMap['/search'] = {};
		localMap['/search'][method] = function (req, res, next) { return self.search(req, res, next); };
		this.urls.push([method+" "+basePath+"/search", "Search for the "+this.plural]);
	} else {
		localMap['/search'] = notSupported;
	}
	
	if (rest.create) {
		localMap.post = function (req, res, next) { return self.create(req, res, next); };
		this.urls.push(["post "+basePath, "Create a new "+this.nameSingle]);
	} else {
		localMap.post = notSupported;
	}
	
	basePath += "/:id";
	if (rest.findById) {
		instanceMap.get = function (req, res, next) { return self.findById(req, res, next); };
		this.urls.push(["get "+basePath, "Find a "+this.nameSingle+" by Id"]);
	} else {
		instanceMap.get = notSupported;
	}
	
	if (rest.updateById) {
		instanceMap.post = function (req, res, next) { return self.updateById(req, res, next); };
		this.urls.push(["post "+basePath, "Find a "+this.nameSingle+" by Id and update it (particulary)"]);
	} else {
		instanceMap.post = notSupported;
	}
	
	if (rest.delById) {
		instanceMap['delete'] = function  (req, res, next) { return self.delById(req, res, next); };
		this.urls.push(["delete "+basePath, "Find a "+this.nameSingle+" by Id and delete it."]);
	} else {
		instanceMap['delete'] = notSupported;
	}
	
	var allowed = this.options.expose;
	var allowedAll = allowed['*'] === true; 
	var methods = (allowedAll)?Object.keys(this.model.schema.methods):Object.keys(allowed);
	var method = "";
	var methodName = "";
	for (var i=0;i<methods.length;i++) {
		methodName = methods[i];
		if (allowedAll && allowed[methodName] === false) continue;
		if (allowedAll || allowed[methodName]) {
			method = '/' + camel2giffen(methodName);
			instanceMap[method] = {
				"post": function (req, res, next) { return self.callInstanceMethod(methodName, req, res, next);}
			}
			this.urls.push([
			                "post "+basePath + method,
			                typeof(allowed[methods[i]]) == "string"?allowed[methodName]:this.nameSingle+"."+methodName
			]);
		}
	};

	localMap["/:id([a-f\\d]{24})"] = instanceMap;
	
	if (map) {
		map["/"+this.pluralURI] = localMap;
	}
	return localMap;
};

/**
 * @param str
 * @returns {String}
 */
function camel2giffen(str) {
	var res = str
				.replace(/$([A-Z]+)/,function(m) {return m.toLowerCase()})
				.replace(/([A-Z]+)/g, function(m) {return "-"+m.toLowerCase();});
	return res;	
};

module.exports = exports = ModelAPI;