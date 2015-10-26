var mongoose = require('mongoose');

var codeSchema = mongoose.Schema({
    owner : {type:mongoose.Schema.ObjectId,ref:'User'},
    title : String,
    url : String,
    description : String,
    content : String,
    language : String,
    date_created : Date,
    visibility : String,
    likes : Number,
    comments : [{
        commentor : {type:mongoose.Schema.ObjectId,ref:'User'},
        date_commented : Date,
        content : String
    }]
});

module.exports = mongoose.model('Code', codeSchema);