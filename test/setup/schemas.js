var async = require("async");
var mongoose = require("mongoose");
var Schema = mongoose.Schema;

var PersonSchema = new Schema({
	firstName: {type: String, required: true},
	lastName: {type: String, required: true},
	email: {type: String, required: true, index: true, unique: true}
}, {
	toObject: {virtuals: true},
	toJSON: {virtuals: true}
});

PersonSchema
	.virtual("fullName")
		.set(function (v) {
			var parts = v.split(/\s/);
			if (parts.length) {
				this.firtsName = parts[0];
				if (parts.length > 1) {
					this.lastName = parts[1];
				} else lastName = "";
			}
			return this.get("fullName");
		})
		.get(function () {
			return this.firstName + " " + this.lastName;
		});
PersonSchema
	.path("email")
		.set(function(v) {
			
			return v.toLowerCase();
		});

var BookSchema = new Schema({
	title: {type: String, required: true, index: true},
	year: {type: Number, required: true, index: true},
	author: {
		type: [{type: Schema.Types.ObjectId, required: true}],
		index: true
	},
	description: String
});


module.exports = exports = {
	schemas: {
		Person: PersonSchema,
		Book: BookSchema
	}
};