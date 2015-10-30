var mongoose = require('mongoose');

var notificationSchema = mongoose.Schema({
	url:String,
	count:Number,
	method:String,
	details : {}
});

module.exports = mongoose.model('Pageview', notificationSchema);