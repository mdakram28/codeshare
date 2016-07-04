var mongoose = require('mongoose');

var CourseSchema = mongoose.Schema({
    id: String,
    code : String,
    title : String,
    type : String,
    credit : Number,
    slots : [{
        slots : String,
        slotNums : [Number],
        classes : [{
            _id : Number,
            venue : String,
            faculty : String
        }]
    }]
});

module.exports = mongoose.model('Course', CourseSchema);