var fs = require("fs");
var Mail = require("./models/mail.js");
var User = require("./models/user.js");
var Notification = require("./models/notification.js");
var Activity = require("./models/activity.js");
var Code = require("./models/code.js");
var async = require("async");
var interceptor = require("./interceptors.js");

module.exports.isEligible = function isEligible(code,user,owner,done){
    if(user==undefined && code.visibility!="pb"){
        done(new Error("restricted"));
    }else if(code.visibility=="pb"){
        done();
    }
    else if(code.visibility == "ff"){
        async.some(owner.friends,function(friend,callback){
            User.findOne({_id:friend},function(err,friendUser){
                if(err){
                    callback(false);
                }else{
                    var isFriendOfFriend = module.exports.isFriendOfUser(friendUser,user);
                    //console.log(isFriendOfFriend);
                    if(isFriendOfFriend==undefined){
                        callback(true);
                    }else{
                        callback(isFriendOfFriend);
                    }
                }
            });
        },function(result){
            //console.log("friend of friend found : "+result);
            if(result==true){
                return done();
            }else{
                return done(new Error("Not found in friend of friend"));
            }
        })
    }
    else if(code.visibility == "fr"){
        var isFriendOfFriend = module.exports.isFriendOfUser(owner,user);
        if(isFriendOfFriend==true || isFriendOfFriend==undefined){
            done();
        }else{
            done(new Error("Not friend"));
        }
    }
    else if(code.visibility == "pt"){
        if(owner._id.toString() == user._id.toString()){
            done();
        }else{
            done(new Error("Private code"));
        }
    }
}

module.exports.getObject = function getObject(id, ref, callback2) {
    ref.findOne({
        _id: id
    }, function(err, obj) {
        if (err) {
            callback2(err);
        } else if (!obj) {
            callback2(new Error('Object not found'));
        } else {
            callback2(null, obj);
        }
    })
}

module.exports.isUsersMail = function isUsersMail(mail, user,doRead) {
    if(doRead==undefined)doRead = false;
    var ret = false;
    mail._receiver.forEach(function(receiver) {
        if (receiver.toString() == user._id.toString()) {
            ret = true;
        }
    });

    if(doRead){
        user.mails.forEach(function(mail2,i){
            if(mail2._mail.toString()==mail._id.toString()){
                user.mails[i].read = true;
                user.save();
                return undefined;
            }
        })
    }
    return ret;
}

module.exports.isFriendOfUser = function isFriendOfUser(user1, user2) {
    if(!user1)return false;
    if (user1._id.toString() == user2._id.toString()) return undefined;
    var ret = false;
    user1.friends.forEach(function(friend) {
        if (friend.toString() == user2._id.toString()) {
            ret = true;
            return;
        }
    });
    return ret;
}

module.exports.compare = function compare(user, search, fields) {
    search = search.split(" ");
    var ret = false;
    fields.forEach(function(field) {
        var str = user[field].split(" ");
        str.forEach(function(key) {
            search.forEach(function(sr) {
                if (key.toLowerCase().indexOf(sr) >= 0) {
                    ret = true;
                    return;
                }
            });
            if (ret) return;
        });
        if (ret) return;
    });
    return ret;
}

module.exports.deleteAt = function deleteAt(list,i){

    var temp=[];
    for(var j=list.length-1;j>=0;j--){
        if(j==i)break;
        temp.push(list.pop());
    }
    list.pop();
    temp.forEach(function(t){
        list.push(t);
    });
}

module.exports.sortAndLimit = function sortAndLimit(mails,limit,offset){
    mails.sort(function(a,b){
        return  b._mail.date_sent.getTime() - a._mail.date_sent.getTime();
    });
    
    return mails.slice(offset,offset+limit);
}

module.exports.liked = function liked(user,code){
    if(!user)return false;
    for(index in user.codesLiked){
        if(user.codesLiked[index].toString() == code._id.toString()){
            return true;
        }
    }
    return false;
}

module.exports.logActivity = function(req,owner,content,visibility,type,callback){
    var act = new Activity();
    act.user = req.user._id;
    act.owner = owner;
    act.content = content;
    act.visibility = visibility;
    act.date_created = new Date();
    act.type = type;

    act.save(callback);
}

module.exports.getActivityHtml = function(activity){
    var ret = {};
    return ret;
};

module.exports.getVisibleCodes = function(user,owner,callback){
    Code.find({owner:owner._id}).populate('owner').exec(function(err,codes){
        var visibleCodes = [];
        async.each(codes,function(code,callback2){
            module.exports.isEligible(code,user,owner,function(err){
                if(!err){
                    switch(code.visibility){
                        case 'pb': code.visibility = "public";break;
                        case 'ff': code.visibility = "Friends of Friends";break;
                        case 'fr': code.visibility = "Friends";break;
                        case 'pt': code.visibility = "Private";break;
                    }
                    visibleCodes.push(code);
                }
                callback2();
            });
        },function(err,result){
            callback(visibleCodes);
        });
    })
};

module.exports.createNotification = function(target,type,content){
    var notif = new Notification();
    notif.owner = target._id;
    notif.content = content;
    notif.type = type;
    notif.date_created = new Date();
    notif.read = false;

    notif.save();
};

module.exports.totalLikes = function(user,callback){
    Code.find({owner:user._id},function(err,codes){
        if(err){
            callback(err);
        }else{
            var total = 0;
            codes.forEach(function(code){
                total += code.likes;
            });
            callback(null,total);
        }
    });
};

module.exports.validateSignupFields = function(username,full_name,email,password,error){
    if(!username || username==''){
        error.field = "username";
        return 'Username must not be blank';
    } 
    if(!full_name || full_name==''){
        error.field = "full_name";
        return 'Full name cannot be blank';
    }  
    if(!email || email==''){
        error.field = "email";
        return "Email cannot be blank";
    }  
    if(!password || password==''){
        error.field = "password";
        return "Password cannot be blank";
    } 
    if(password==username){
        error.field = "password";
        return "Password must not be same as username";
    } 
    if(email.length < 6 || email.indexOf('@')==-1 || email.lastIndexOf('@')>email.lastIndexOf('.') || email.lastIndexOf('.')-email.lastIndexOf('@')<2){
        error.field = "email";
        return "Invalid email";
    }
    if(username.length < 8 || username.length > 15){
        error.field = "username";
        return "username can be between 8 to 15 characters long";
    } 
    if(password.length < 8){
        error.field = "password";
        return "password must be at least 8 characters long";
    } 
    var alphabets = 0;
    var special = 0;
    var digits = 0;
    for(i in password){
        if('1234567890'.indexOf(password.charAt(i))>=0)digits++;
        else if('!@#$%^&*()~_+-={}[]:";\'<>?,.//*-+'.indexOf(password.charAt(i))>=0)special++;
        else if('qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM'.indexOf(password.charAt(i))>=0)alphabets++;
        else if(password.charAt(i)==' ')continue;
        else{
            error.field = "password";
            return 'Invalid character found in password';
        }
    }
    if(alphabets==0 || digits==0){
        error.field = "password";
        return 'Password must contain at least one digit and one number';
    }


    alphabets = 0;
    special = 0;
    digits = 0;
    for(i in username){
        if('1234567890'.indexOf(username.charAt(i))>=0)digits++;
        else if('!@#$%^&*()~_+-={}[]:";\'<>?,.//*-+'.indexOf(username.charAt(i))>=0)special++;
        else if('qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM'.indexOf(username.charAt(i))>=0)alphabets++;
        else if(username.charAt(i)==' ')continue;
        else{
            error.field = "username";
            return 'Invalid character found in username';
        }
    }
    if(special>0){
        error.field = "username";
        return 'Password must not contain any special character';
    }

    return '';
}

module.exports.mapString = function(s,map){
    
}