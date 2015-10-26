var mongoose = require('mongoose');

var activitySchema = mongoose.Schema({
    user: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    },
    owner: {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    },
    content: {},
    visibility: String,
    date_created: Date,
    type: String
});

module.exports = mongoose.model('Activity', activitySchema);
