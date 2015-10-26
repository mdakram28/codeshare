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

    app.post('/upload-profile-pic', require("multer")({
        dest: './uploads/'
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

        res.redirect('/');
    });

    app.get('/profile-pic', function(req, res) {
        var gfs = app.locals.gfs;
        var username = '';

        if (req.query.user != undefined) {
            username = req.query.user;
        } else if (req.isAuthenticated()) {
            username = req.user.username;
        }
        
        User.findOne({username:username},function(er, user) {
            if(er)return res.send(500);
            if(!user || !user.regno){
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
        res.locals.folderView = req.query.f || 'index';
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
                        //console.log(mail);
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
                                mail = JSON.parse(JSON.stringify(mail));
                                mail._mail._sender = {
                                    username: sender.username,
                                    full_name: sender.full_name
                                };
                                ret.push(mail._mail);
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
                util.isUsersMail(ret, req.user, true);
                callback();
            }], function(err, result) {
                if (err) {
                    res.render('500');
                } else if (!ret) {
                    res.render('500');
                } else {
                    res.locals.mail = ret;
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
}
