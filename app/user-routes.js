var fs = require("fs");
//var Folder = require("./models/folder.js");
var Mail = require("./models/mail.js");
var User = require("./models/user.js");
var Code = require("./models/code.js");
var Notification = require("./models/notification.js");
var async = require("async");
var interceptor = require("./interceptors.js");
var util = require("./util.js");
var request = require("request");

module.exports = function(app, passport, sockets) {

    app.post('/upload-profile-pic', require("multer")({dest: './uploads/'
    }).single('profilepic'), interceptor.isLoggedInAPI, function(req, res) {
        //console.log(req.file);
        var dirname = require('path').dirname(__dirname);
        var filename = req.file.name;
        var path = req.file.path;
        var type = req.file.mimetype;

        var read_stream = fs.createReadStream(dirname + '/' + path);
        var gfs = app.locals.gfs;

        //console.log('saving file : ' + req.user._id);
        var writestream = gfs.createWriteStream({
            _id: req.user.username,
            filename: req.user.usernames
        });
        read_stream.pipe(writestream);
        
        req.cloudinary.uploader.upload(path, function(result) {
            req.user.profile_pic_url = result.public_id;
            req.user.save();
        });

        res.redirect('/');
    });

    app.get('/profile-pic', function(req, res) {
        var gfs = app.locals.gfs;
        var username = '';

        if (req.query.user != undefined) {
            username = req.query.user;
        } else if (req.isAuthenticated()) {
            username = req.user.username;
        }else{
            res.sendStatus(404);
        }
        
        User.findOne({username:username},function(er, user) {
            if(er || !user)return res.send(404);
            if(!user.regno || req.local){
                gfs.files.find({
                    _id: username
                }).toArray(function(err, files) {
                    if (err) {
                        res.send(404);
                    } else if (files.length > 0) {
                        var mime = 'image/jpeg';
                        res.set('Content-Type', mime);
                        var read_stream = gfs.createReadStream({
                            _id: username
                        });
                        read_stream.pipe(res);
                    } else {
                        res.set('Content-Type', 'image/png');
                        fs.createReadStream('./public/dist/img/avatar.png').pipe(res);
                    }
                });
            }else{
                request('https://academics.vit.ac.in/student/view_photo_2.asp?rgno='+user.regno).pipe(res);
            }
        });
    });

    app.get('/compose', interceptor.isLoggedIn, function(req, res) {
        if (!req.query.to) {
            req.query.to = [];
        } else {
            req.query.to = req.query.to.split(";");
        }
        var modelMailId = req.query.model || '561d3ebf41739d4c0d5cd655';
        async.series([function(callback) {
            Mail.findOne({
                _id: modelMailId
            }, function(err, modelMail) {
                if (err) return callback(err);
                if (!modelMail) modelMail = {
                    content: '',
                    subject: ''
                };
                else if (modelMail._sender.toString() != req.user._id.toString()) {
                    return callback(new Error('Unauthorized'));
                }
                res.locals.modelMail = modelMail;
                //console.log(modelMail);
                callback();
            });
        }, function(callback) {
            User.findOne({
                _id: req.user._id
            }).populate('friends').exec(function(err, user) {
                if (err) {
                    return callback(err);
                }
                var friendNames = [];
                user.friends.forEach(function(friend, i) {
                    friendNames.push({
                        id: i,
                        username: friend.username,
                        full_name: friend.full_name
                    });
                });
                //console.log(friendNames);
                res.locals.user = req.user;
                res.locals.to = req.query.to || '';
                res.locals.friends = friendNames;
                callback();
            });
        }], function(err, result) {
            if (err) {
                res.render('500');
            } else {
                res.render('compose');
            }
        });
    });

    app.get('/mailbox', interceptor.isLoggedIn, function(req, res) {



        res.render('mailbox');
    });

    app.get('/users/:tab', interceptor.isLoggedIn, function(req, res) {
        res.locals.tab = req.params.tab;
        User.find({}, function(err, users) {
            if (err || !users || users.length == 0) return res.render("500");
            var result = [];
            users.forEach(function(user) {
                var isFriend = util.isFriendOfUser(req.user, user);
                result.push({
                    username: user.username,
                    full_name: user.full_name,
                    me: isFriend == undefined ? true : false,
                    isFriend: isFriend == undefined ? false : isFriend,
                    //match: util.compare(user, search, ["username", "full_name"]),
                    auth: req.isAuthenticated(),
                    profile_pic_url: user.profile_pic_url,
                    following: req.user.following.indexOf(user._id) >= 0,
                    follower: req.user.followers.indexOf(user._id) >= 0
                });
            });
            res.locals.users = result;
            res.render("users");
        });
    });

    app.get('/users/:username/:tab', function(req, res) {
        res.locals.tab = req.params.tab;
        var username = req.params.username;
        User.findOne({
            username: username
        }, function(err, profileUser) {
            if (err || !profileUser) return res.render("500");
            User.find({}, function(err, users) {
                if (err || !users || users.length == 0) return res.render("500");
                var result = [];
                users.forEach(function(user) {
                    var isFriend = util.isFriendOfUser(req.user, user);
                    result.push({
                        username: user.username,
                        full_name: user.full_name,
                        me: isFriend == undefined ? true : false,
                        isFriend: isFriend == undefined ? false : isFriend,
                        profile_pic_url:user.profile_pic_url,
                        //match: util.compare(user, search, ["username", "full_name"]),
                        auth: req.isAuthenticated(),
                        following: profileUser.following.indexOf(user._id) >= 0,
                        follower: profileUser.followers.indexOf(user._id) >= 0
                    });
                });
                res.locals.users = result;
                res.render("users");
            });
        });
    });

    app.get('/search', function(req, res) {
        var search = req.query.q;
        var tab = req.query.tab;
        if (!search) search = '';
        if (!tab) tab = 'friends';

        res.locals.tab = tab;
        // User.textSearch(search,function(err,output){
        //     if(err){
        //         output = err;
        //     }

        //     console.log(output);
        //     res.render("search",{result:output});
        // });
        async.series([
            function(callback) {
                User.find({}, function(err, users) {
                    if (err) return callback(err);
                    var members = [];
                    users.forEach(function(user) {
                        var isFriend = util.isFriendOfUser(req.user, user);
                        members.push({
                            username: user.username,
                            full_name: user.full_name,
                            me: isFriend == undefined ? true : false,
                            isFriend: isFriend == undefined ? false : isFriend,
                            match: util.compare(user, search, ["username", "full_name"]),
                            profile_pic_url:user.profile_pic_url,
                            auth: req.isAuthenticated(),
                            following: req.user ? req.user.following.indexOf(user._id) >= 0 : false
                        });
                    });
                    res.locals.result_members = members;
                    callback();
                });
            },
            function(callback) {
                Code.find({}).populate('owner').exec(function(err, codes) {
                    if (err) return callback(err);
                    var visibleCodes = [];

                    async.each(codes, function(code, callback2) {
                        util.isEligible(code, req.user, code.owner, function(err) {
                            if (!err) {
                                switch (code.visibility) {
                                    case 'pb':
                                        code.visibility = "public";
                                        break;
                                    case 'ff':
                                        code.visibility = "Friends of Friends";
                                        break;
                                    case 'fr':
                                        code.visibility = "Friends";
                                        break;
                                    case 'pt':
                                        code.visibility = "Private";
                                        break;
                                }
                                code.match=util.compare(code, search, ["title", "description","language"]);
                                visibleCodes.push(code);
                            }
                            callback2();
                        });
                    }, function(err, result) {
                        res.locals.codes = visibleCodes;
                        callback();
                    });
                });
            },
            function(callback){
                res.locals.resultEmpty = true;
                res.locals.result_members.forEach(function(result){
                    if(result.match){
                        res.locals.resultEmpty = false;
                        return true;
                    }
                });

                res.locals.codesEmpty = true;
                res.locals.codes.forEach(function(code){
                    if(code.match){
                        res.locals.codesEmpty = false;
                        return true;
                    }
                });
                callback();
            }
        ], function(err, result) {
            if (err) {
                res.render("500");
            } else {
                res.render('search');
            }
        })
    });

    app.get('/profile', function(req, res) {
        if (!req.query.user && !req.isAuthenticated()) return res.render("500");
        var username = req.query.user || req.user.username;
        User.findOne({
            username: username
        }, function(err, user) {
            res.locals.profile = user;
            res.locals.auth = req.isAuthenticated();
            util.getVisibleCodes(req.user, user, function(codes) {
                res.locals.codes = codes;
                res.locals.me = res.locals.auth ? user.username == req.user.username : false;
                res.locals.isFriend = req.isAuthenticated() ? req.user.friends.indexOf(user._id) >= 0 : false;
                res.locals.isFollowing = req.isAuthenticated() ? req.user.following.indexOf(user._id) >= 0 : false;
                res.render("profile");
            });
        })
    });

    app.get('/friends', interceptor.isLoggedIn, function(req, res) {
        //console.log(req.user);
        User.findOne({
            _id: req.user._id
        }).populate('friends').exec(function(err, user) {
            if (err) {
                res.render('500');
            } else {
                req.user = user;
                res.locals.user = user;
                res.locals.friends = user.friends;
                //console.log(user);
                res.render('friends');
            }
        });
    });

    app.get('/mail', interceptor.isLoggedIn, function(req, res) {
        res.locals.folderView = req.query.f || 'inbox';
        res.locals.index = req.query.i || 0;
        var ret = [];
        if (req.query.id != undefined) {
            async.series([function(callback) {
                Mail.findOne({
                    _id: req.query.id
                }).populate('_sender').exec(function(err, mail) {
                    if (err) {
                        callback(err);
                    } else if (!mail) {
                        callback(new Error('Mail not found'));
                    } else {
                        //console.log(mail._receiver);
                        //console.log(req.user._id);
                        if (!util.isUsersMail(mail, req.user, true)) return callback(new Error('Unauthorized'));
                        else if (!mail.read) {
                            //mail.read = true;
                            mail.date_read = new Date();
                        }
                        mail.save(function(err) {
                            if (err) {
                                callback(err);
                            } else {
                                callback(null, mail);
                            }
                        })
                    }
                });
            }], function(err, result) {
                if (err) {
                    //console.log(err);
                    res.render('500');
                } else {
                    var mail = result[0];
                    res.render('read-mail', {
                        mail: mail
                    });
                }
            });
        } else {
            async.series([function(callback) {
                User.findOne({
                    _id: req.user._id
                }).populate('mails._mail').exec(function(err, user) {
                    if (err) return callback(err);
                    async.each(user.mails, function(mail, callback2) {
                        //console.log(mail);
                        if (mail.folder_name == res.locals.folderView) {
                            User.findOne({
                                _id: mail._mail._sender
                            }, function(err, sender) {
                                if (err) {
                                    return callback2(err);
                                }
                                mail._mail._sender.username = sender.username;
                                mail._mail._sender.full_name = sender.full_name;
                                console.log(mail);
                                ret.push(mail);
                                callback2();
                            });
                        } else {
                            callback2();
                        }
                    }, function(err, result) {
                        if (err) {
                            callback(err);
                        } else {
                            ret = util.sortAndLimit(ret, 1, res.locals.index)[0];
                            callback();
                        }
                    });
                });
            }, function(callback) {
                if(ret==undefined)return callback(new Error("Out of range id"));
                var mail = ret;
                if (!util.isUsersMail(mail._mail, req.user, true)) return callback(new Error('Unauthorized'));
                else if (!mail._mail.read) {
                    mail._mail.read = true;
                    mail._mail.date_read = new Date();
                }
                mail._mail.save(function(err) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null);
                    }
                })
            }], function(err, result) {
                if (err) {
                    res.render('500');
                } else if (!ret) {
                    res.render('500');
                } else {
                    res.locals.mail = ret._mail;
                    res.render('read-mail');
                }
            });
        }
    });

    app.get('/follow', function(req, res) {        
        var end = function() {
            require("./redirect-handler.js")(req, res);
        }
        if (!req.isAuthenticated()) return end();
        if (!req.query.user) return end();
        if (req.query.user == req.user.username) return end();
        User.findOne({
            username: req.query.user
        }, function(err, user) {
            if (err || !user) {
                console.log(err);
                return end();
            }
            if (req.user.following.indexOf(user._id) >= 0) {
                util.deleteAt(req.user.following, req.user.following.indexOf(user._id));
                util.deleteAt(user.followers, user.followers.indexOf(req.user._id));

            } else {
                req.user.following.push(user._id);
                user.followers.push(req.user._id);
            }

            async.series([
                function(callback) {
                    req.user.save(callback);
                },
                function(callback) {
                    user.save(callback);
                },
                function(callback) {
                    Notification.remove({
                        owner: user._id,
                        type: "new-follower"
                    }, callback);
                },
                function(callback) {
                    var notif = new Notification();
                    notif.owner = user._id;
                    notif.type = "new-follower";
                    notif.read = false;
                    notif.date_created = new Date();
                    notif.save(callback);
                }
            ], function(err, result) {
                if (err) throw err;
                end();
            });
        })
    });

    app.get('/toggleContact', function(req, res) {
        var end = function() {
            require("./redirect-handler.js")(req, res);
        }
        if (!req.isAuthenticated() || !req.query.user) return end();
        User.findOne({
            username: req.query.user
        }, function(err, user) {
            if (err || !user) return end();

            if (req.user.friends.indexOf(user._id) >= 0) {
                util.deleteAt(req.user.friends, req.user.friends.indexOf(user._id));
            } else {
                req.user.friends.push(user._id);
            }
            req.user.save();
            end();
        });
    });

    app.post("/updateUserSettings",interceptor.isLoggedIn,function(req,res){
        var error = {field:''}
        var msg = util.validateSignupFields(req.user.username,req.body.full_name,req.body.email,req.user.password,error);
        if(msg!='' && msg!=undefined){
            req.flash("error_message",msg);
            req.flash("error_field",error.field);
            return res.redirect("/profile?tab=settings");
        }

        if(!req.body.full_name || req.body.full_name=='' || !req.body.email || req.body.email==''){
            req.flash("error_message","One or more fields are empty");
            return res.redirect("/profile?tab=settings");
        }

        req.user.full_name = req.body.full_name;
        req.user.email = req.body.email;

        if(req.body.prevPass!='' && req.body.newPass!='' && req.body.confPass!=''){
            if(!req.user.validPassword(req.body.prevPass)){
                req.flash("error_message","Original passwords incorrect");
                return res.redirect("/profile?tab=settings");
            }
            if(req.body.confPass!=req.body.newPass){
                req.flash("error_message","new passwords do not match");
                return res.redirect("/profile?tab=settings");
            }
            msg = util.validateSignupFields(req.user.username,req.body.full_name,req.body.email,req.body.newPass,error);
            if(msg!='' && msg!=undefined){
                req.flash("error_message",msg);
                return res.redirect("/profile?tab=settings");
            }
            req.user.password = req.user.generateHash(req.body.newPass);
        }else if((req.body.prevPass!='' && req.body.prevPass!=undefined) || (req.body.newPass!='' && req.body.newPass!=undefined) || (req.body.confPass!='' && req.body.confPass!=undefined)){
            req.flash("error_message","One or more password field(s) are blank");
            res.redirect("/profile?tab=settings");
        }
        req.user.save(function(err,user){
            if(err){
                req.flash("error_message","Some error occurred while saving new user settings");
                return res.redirect("/profile?tab=settings");
            }
            req.flash("success_message","Settings successfully updated");
            res.redirect("/profile?tab=settings");
        });
    });
}
