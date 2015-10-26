var mongoose = require('mongoose');

var mailSchema = mongoose.Schema({
    content : String,
    subject: String,
    _sender : { type: mongoose.Schema.ObjectId, ref: 'User' },
    _receiver : [{ type: mongoose.Schema.ObjectId, ref: 'User' }],
    date_sent : Date,
    date_read : Date
});

module.exports = mongoose.model('Mail', mailSchema);