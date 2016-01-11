var extend = require('util')._extend;
var path = require("path");

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
	this.path = path.join(ModelAPI.path, this.pluralURI);
	this.rootPath = path.join(ModelAPI.rootPath, this.pluralURI);

	this.options = {
		rest: extend({}, ModelAPI.defaults.options.rest),
		expose: extend({}, ModelAPI.defaults.options.expose),
		exposeStatic: extend({}, ModelAPI.defaults.options.exposeStatic),
		fields: options.fields || ModelAPI.defaults.options.fields,
		listFields: options.listFields || options.fields || ModelAPI.defaults.options.listFields,			
		queryFields: options.queryFields || ModelAPI.defaults.options.queryFields,
		sortFields: options.sortFields || ModelAPI.defaults.options.sortFields,
		searchMethod: options.searchMethod || ModelAPI.defaults.options.searchMethod,

		populate: options.populate || ModelAPI.defaults.options.populate
	};
	this.options.skipAllowed = (options.skipAllowed == null) ? 
			ModelAPI.defaults.options.skipAllowed : 
			options.skipAllowed;
	this.options.limitAllowed = (options.limitAllowed == null ) ? 
			ModelAPI.defaults.options.limitAllowed :
			options.limitAllowed;
	this.options.sortAllowed = (options.sortAllowed == null) ? 
			ModelAPI.defaults.options.sortAllowed : 
			options.sortAllowed;

	this.options.rest = extend(this.options.rest, options.rest);
	this.options.expose = extend(this.options.expose, options.expose);
	this.options.exposeStatic = extend(this.options.exposeStatic, options.exposeStatic);

}

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
		fields: {},		
		queryFields: null,
		sortFields: null,
		
		popuplate: null,
		listPopulate: null,
		
		searchMethod: 'post',
		skipAllowed: true,
		limitAllowed: true,
		sortAllowed: true
	},
	map:  {
		options: function(req, res, next) {		
			res.send([['options '+ModelAPI.rootPath, 'List all API options.']].concat(ModelAPI.urls));
		}
	},
	urls: []
};
ModelAPI.map = extend({}, ModelAPI.defaults.map);
ModelAPI.urls = ModelAPI.defaults.urls;

function buildQuery(req, restMethod) {
	var method = this.options.searchMethod.toLowerCase();
	var query = {};
	if (restMethod == 'search') {
		query = extend({}, (method == "post") ? req.body : req.query);
		if (method == "get") {
			if (query._sort) delete query._sort;
			if (query._limit) delete query._limit;
			if (query._skip) delete query._skip;
		}
		if (this.options.queryFields) {
			var keys = Object.keys(query);
			var i = keys.length;
			while (i--) {
				if (!this.options.queryFields[keys[i]]) delete query[keys[i]];
			}
		}
	};
	var skip = this.options.skipAllowed && req.query._skip; 
	var limit = this.options.limitAllowed && req.query._limit;
	var sort = this.options.sortAllowed && req.query._sort;
	var fields = this.options.listFields;
	extend(query, this.filter);
	var dbQuery = this.model.find(query, fields);
	if (skip) {
		dbQuery = dbQuery.skip(skip);
	}
	if (limit) {
		dbQuery = dbQuery.limit(limit);
	}
	if (sort) {		
		var sortParams = sort.split(/[,;]/);
		var l = sortParams.length;
		var r;
		var allowedAll=(this.options.sortFields == null);
		sort = [];
		for (var i=0;i<l;i++) {
			r = /^([+-]?)([^+-]+)([+-]?)$/.exec(sortParams[i]);
			if (r) {
				if (allowedAll || this.options.sortFields[r[2]]) {
					sort.push(
					  ((r[1]=="-"||r[3]=="-")?"-":"") + r[2]
					);
				}
			}
		}
		if (sort.length) {
			dbQuery = dbQuery.sort(sort.join(" "));
		}
	}
	if (this.options.listPopulate) {
		dbQuery = dbQuery.populate(this.options.listPopulate);
	}
	return dbQuery;
}

ModelAPI.assign = function ModelAPI__assign(expressApp, url, version, root) {
	this.url = url || ModelAPI.defaults.url;
	this.version = version || ModelAPI.defaults.version;
	this.root = root || "";
	this.path = path.join(this.url, this.version);
	this.rootPath = path.join(this.root, this.path);
	this.expressApp = expressApp;
	this.mapper = mapClosure(expressApp);
	this.map = extend({}, ModelAPI.defaults.map);
	this.urls = ModelAPI.defaults.urls;
	return this;
};

ModelAPI.implement = function ModelAPI__implement() {
	var map = {};
	map[this.path] = this.map; 
	this.mapper(map);
	this.expressApp.use(this.path, notSupported);
	this.expressApp.use(this.path, function(err, req, res, next) {
		if (err) {
			res.status(500);
			res.send({error: err.message});
		} else {
			next();
		}
	});
	return this;
};

ModelAPI.expose = function ModelAPI__expose(model, options) {
	var modelAPI = model;
	if (!(modelAPI instanceof ModelAPI)) {
		modelAPI = new ModelAPI(model, options);
	}
	modelAPI.map(ModelAPI.map);
	ModelAPI.urls = ModelAPI.urls.concat(modelAPI.urls); 
	return ModelAPI;
};

ModelAPI.prototype.search = function ModelAPI__search(req, res, next) {
	
	buildQuery.call(this, req, "search").exec(function (err, obj) {
		if (err) return next(err);
		res.send(obj);
	});
	
};

ModelAPI.prototype.create = function ModelAPI__create(req, res, next) {
	var self = this;
	if (req.body._id) {
		res.statusCode = 401;
		var msg = "Use post ~/"+this.pluralURI+"/"+req.body._id+" to update a(n) "+this.nameSingle;
		return res.send({error: msg});
	}
	var obj = new (this.model)(req.body);
	obj.save(function (err) {
		if (err) {
			if (err.name && err.name == "ValidationError") {
				return response422(res, err);
			}
			next(err);
		}
		req.params.id = obj._id;
		res.statusCode = 201;
		return self.findById(req, res, next);
    });
};

ModelAPI.prototype.findById = function ModelAPI__findById(req, res, next) {
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
};

ModelAPI.prototype.updateById = function ModelAPI__updateById(req, res, next) {
	var self = this;
	var id = req.params.id;
	var query = extend({_id: id}, this.filter);
	this.model.findOne(query, function (err, obj) {
		if (err) return next(err);
		if (!obj) return response404(res);
		extend(obj, req.body);
		obj.save(function (err) {
			if (err) {
				if (err.name && err.name == "ValidationError") {
					return response422(res, err);
				}
				return next(err);
			}
			return self.findById(req, res, next);
		});
	});
};

ModelAPI.prototype.delById = function ModelAPI__delById(req, res, next) {
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
};

ModelAPI.prototype.callInstanceMethod = function ModelAPI__callInstanceMethod (method, req, res, next) {
	var query = extend({_id: req.params.id}, this.filter);
	this.model.findById(query, function (err, obj) {
		if (err) return next(err);
		if (!obj) {
			res.statusCode = "404";
			return res.send({error: "Not found"});
		};
		mFunc = obj[method]; 
		mFunc.call(obj, req.body, function(err, obj) {
			if (err) next(err);
			res.send(obj);
		});
	});
};

function notSupported(req, res, next) {
	res.statusCode = "405";
	res.send({error: "Not supported"});
};

function wrapperCall(mName, self, func) {
	return function(req, res, next) {
		return func.call(self, mName, req, res, next);
	};
};

ModelAPI.prototype.map = function ModelAPI__map(map) {
	var self = this;
	var localMap = {};
	var instanceMap = {};
	var rest = this.options.rest;
	this.urls = [];
	var basePath = this.rootPath;
	
	localMap.options = function(req, res, next) {
		res.send(self.urls);
	};
	
	this.urls.push(["options "+basePath, "List API-options for "+this.plural]);
	var method = this.options.searchMethod.toLowerCase();
	
	if (rest.list || (rest.search && method == "get")) {
		localMap.get = function (req, res, next) { return self.search(req, res, next); };
		this.urls.push(["get "+basePath,  "List/Search all "+this.plural]);
	};
	
	if (rest.search && method != "get") {		
		localMap['/search'] = {};
		localMap['/search'][method] = function (req, res, next) { return self.search(req, res, next); };
		this.urls.push([method+" "+basePath+"/search", "Search for the "+this.plural]);
	};
	
	if (rest.create) {
		localMap.post = function (req, res, next) { return self.create(req, res, next); };
		this.urls.push(["post "+basePath, "Create a new "+this.nameSingle]);
	};
	
	basePath += "/:id";
	if (rest.findById) {
		instanceMap.get = function (req, res, next) { return self.findById(req, res, next); };
		this.urls.push(["get "+basePath, "Find a "+this.nameSingle+" by Id"]);
	};
	
	if (rest.updateById) {
		instanceMap.post = function (req, res, next) { return self.updateById(req, res, next); };
		this.urls.push(["post "+basePath, "Find a "+this.nameSingle+" by Id and update it (particulary)"]);
	};
	
	if (rest.delById) {
		instanceMap['delete'] = function  (req, res, next) { return self.delById(req, res, next); };
		this.urls.push(["delete "+basePath, "Find a "+this.nameSingle+" by Id and delete it."]);
	};
	
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
				"post": wrapperCall(methodName, self, self.callInstanceMethod) 
			};
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

function response422(res, err) {
	res.status(422);
	res.send({error: err.message, errors: err.errors});
}

function response404(res) {
	res.status(404);
	res.send({error: "Not found"});
}

/**
 * @param str
 * @returns {String}
 */
function camel2giffen(str) {
	var res = str
				.replace(/^([A-Z]+)/, function(m) {return m.toLowerCase();})
				.replace(/([A-Z]+)/g, function(m) {return "-"+m.toLowerCase();});
	return res;	
};

module.exports = exports = ModelAPI;