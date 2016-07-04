var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');


var userSchema = mongoose.Schema({
    username: String,
    full_name: String,
    email: String,
    password: String,
    folders: [String],
    date_joined: Date,
    regno: String,
    friends: [{type: mongoose.Schema.ObjectId, ref: 'User'}],
    mails: [{
        _mail: {
            type: mongoose.Schema.ObjectId,
            ref: 'Mail'
        },
        _sender:{username : String,full_name:String},
        folder_name: String,
        read: Boolean
    }],
    codesLiked: [{type: mongoose.Schema.ObjectId, ref: 'Code'}],
    followers: [{type: mongoose.Schema.ObjectId, ref: 'User'}],
    following: [{type: mongoose.Schema.ObjectId, ref: 'User'}],
    courses: [{type: mongoose.Schema.ObjectId, ref: 'Course'}],
    profile_pic_url: {type:String , default:"http://res.cloudinary.com/mdakram28/image/upload/v1446041733/ki51vwmmotttrvxlfcum.png"}
});

userSchema.pre("save", function(next) {
    
    // if (!this.folders || this.folders.length == 0) {
        this.folders = ['inbox', 'draft', 'sent', 'junk', 'trash'];
    // }
    next();
});

userSchema.plugin(require('mongoose-text-search'));
userSchema.index({username:'text'});

userSchema.methods.generateHash = function(password) {
    return bcrypt.hashSync(password, bcrypt.genSaltSync(8), null);
};

userSchema.methods.validPassword = function(password) {
    return bcrypt.compareSync(password, this.password);
};

module.exports = mongoose.model('User', userSchema);