var mongoose = require('mongoose');

var notificationSchema = mongoose.Schema({
	owner:{ type: mongoose.Schema.ObjectId, ref: 'User' },
    content:{},
    type:String,
    read:Boolean,
    date_created:Date
});

module.exports = mongoose.model('Notification', notificationSchema);