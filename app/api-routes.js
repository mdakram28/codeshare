var fs = require("fs");
//var Folder = require("./models/folder.js");
var Mail = require("./models/mail.js");
var User = require("./models/user.js");
var Code = require("./models/code.js");
var Notification = require("./models/notification.js");
var async = require("async");
var interceptor = require("./interceptors.js");
var util = require("./util.js");

module.exports = function(app, passport, sockets) {

    app.get('/api/readNotifications', interceptor.isLoggedInAPI, function(req, res) {
        Notification.find({
            owner: req.user._id
        }, function(err, notifs) {
            if (err || !notifs) return res.send({
                success: false
            });
            notifs.forEach(function(notif) {
                notif.read = true;
                notif.save();
            });
            res.send({
                success: true
            });
        });
    });

    app.get('/api/mails', function(req, res) {
        var folder = req.query.folder;
        var offset = !req.query.off ? 0 : req.query.off;
        var limit = !req.query.lim ? 20 : req.query.lim;
        var unread = 0;
        async.series([
            function(callback) {
                if (req.user.folders.indexOf(folder) == -1) {
                    callback(new Error('folder name not present'));
                } else {
                    //console.log(req.user.mails);
                    callback();
                }
            },
            function(callback) {
                var ret = [];
                User.findOne({
                    _id: req.user._id
                }).populate('mails._mail').exec(function(err, mailsUser) {
                    if (err) {
                        callback(err);
                    }
                    //console.log(mailsUser);
                    var i = 0;
                    async.each(mailsUser.mails, function(mail, callback2) {
                        //console.log(mail._sender);
                        if (!mail.read) unread++;
                        if (mail.folder_name == folder) {
                            User.findOne({
                                _id: mail._mail._sender
                            }, function(err, sender) {
                                if (err) {
                                    callback2(err);
                                } else {
                                    mail._sender = {
                                        username: sender.username,
                                        full_name: sender.full_name
                                    };
                                    mail._mail.content = mail._mail.content.length > 41 ? mail._mail.content.substring(0, 41) : mail._mail.content;
                                    ret.push(mail);
                                    callback2();
                                }
                            })
                        } else {
                            callback2();
                        }
                    }, function(err, result) {
                        if (err) {
                            callback(err);
                        } else {
                            callback(null, ret);
                        }
                    })
                });
            }
        ], function(err, result) {
            if (err) {
                return res.json(JSON.stringify({
                    success: false,
                    unread: unread,
                    error: err
                }));
            } else {
                return res.json({
                    success: true,
                    mails: util.sortAndLimit(result[1], limit, offset)
                });
            }
        })
    });

    app.post('/api/sendmail', interceptor.isLoggedInAPI, function(req, res) {
        //console.log(req.body.to);
        var to = req.body.to;
        var subject = req.body.subject;
        var content = req.body.content;
        var folder = req.body.folder || 'inbox';
        if (folder != 'inbox') {
            to = [req.user.username];
            //console.log(req.user.folders.indexOf(folder));
            if (req.user.folders.indexOf(folder) == -1) {
                return res.json({
                    success: false
                });
            }
        }

        var newMail = new Mail();
        var receiver_id = [];
        async.series([function(callback) {
                newMail.content = content;
                newMail.subject = subject;
                newMail.read = false;
                newMail._sender = req.user._id;
                newMail.date_sent = new Date();
                newMail.save(function(err, mail) {
                    if (err) {
                        callback(err);
                    } else {
                        newMail._id = mail._id;
                        callback();
                    }
                });
            },
            function(callback) {
                var total = 0;
                var done = 0;
                to.forEach(function(friend, i) {
                    total++;
                    User.findOne({
                        username: to[i]
                    }, function(err, receiver) {
                        if (err) {
                            callback(err);
                        } else if (!receiver) {
                            callback(new Error('Invalid receiver id'));
                        } else {
                            receiver_id.push(receiver._id);
                            receiver.mails.push({
                                _mail: newMail._id,
                                folder_name: folder,
                                read: folder != 'inbox'
                            });
                            receiver.save(function(err) {
                                if (err) {
                                    callback(err);
                                } else {
                                    done++;
                                    if (done >= total) {
                                        callback();
                                    }
                                }
                            });
                            sockets.notifyUnread(receiver);
                        }
                    });
                });
            },
            function(callback) {
                if (folder != 'inbox') return callback();
                receiver_id.push(req.user._id);
                req.user.mails.push({
                    _mail: newMail._id,
                    folder_name: 'sent',
                    read: true
                });
                req.user.save(callback);
            },
            function(callback) {
                Mail.findOne({
                    _id: newMail._id
                }, function(err, mail) {
                    if (err) {
                        callback(err);
                    } else if (!mail) {
                        callback(new Error('Unknown error'));
                    } else {
                        mail._receiver = receiver_id;
                        mail.save(callback);
                    }
                });
            }
        ], function(err, result) {
            if (err) {
                return res.json({
                    success: false
                });
            } else {
                return res.json({
                    success: true
                });
            }
        });

        //console.log(req.body);
    });

    app.get('/api/unreadMails', interceptor.isLoggedInAPI, function(req, res) {
        var folders = {};
        var allMails = {};
        req.user.folders.forEach(function(folder) {
            folders[folder] = 0;
            allMails[folder] = 0;
        });
        // var counted = 0;
        // var total = req.user.mails.length;
        var errors = [];
        req.user.mails.forEach(function(mail) {
            // util.getObject(mail._mail, Mail, function(err, response) {
            //     console.log(response);
            //     if (err) {
            //         console.log(err);
            //         errors.push(err);
            //     } else {
            //         if (!response.read) folders[mail.folder_name]++;
            //         allMails[mail.folder_name]++;
            //     }
            //     counted++;
            //     console.log(counted + " : " + total);
            //     if (counted >= total) {
            //         if (errors.length > 0) {
            //             res.json({
            //                 success: false
            //             });
            //         } else {
            //             res.json({
            //                 success: true,
            //                 folders: folders,
            //                 total: allMails
            //             })
            //         }
            //     }
            // });
            if (!mail.read) folders[mail.folder_name]++;
            allMails[mail.folder_name]++;
        });
        res.json({
            success: true,
            folders: folders,
            total: allMails
        })
    });
    // add friend
    app.get('/api/addFriend', interceptor.isLoggedInAPI, function(req, res) {
        User.findOne({
            username: req.query.user
        }, function(err, friend) {
            if (err) {
                res.send(500);
            } else if (!friend) {
                res.send(404);
            } else {
                if (util.isFriendOfUser(req.user, friend)) {
                    return res.json({
                        success: false,
                        error: "friend already"
                    })
                }
                req.user.friends.push(friend._id);
                util.createNotification(friend,"added-as-contact",{username:req.user.username,full_name:req.user.full_name});
                req.user.save(function(err) {
                    if (err) {
                        res.send(500);
                    } else {
                        res.json({
                            success: true
                        });
                    }
                })
            }
        })
    });

    app.get('/api/removeFriend', interceptor.isLoggedInAPI, function(req, res) {
        User.findOne({
            username: req.query.user
        }, function(err, friend) {
            if (err) {
                res.send(500);
            } else if (!friend) {
                res.send(404);
            } else {
                if (!util.isFriendOfUser(req.user, friend)) {
                    return res.json({
                        success: false,
                        error: "not friend"
                    })
                }
                req.user.friends.forEach(function(friend2, index) {
                    if (friend2.toString() == friend._id.toString()) {
                        util.deleteAt(req.user.friends, index);
                        //console.log(req.user.friends);
                    }
                });
                req.user.save(function(err) {
                    if (err) {
                        res.json({
                            success: false,
                            error: "Unknown"
                        });
                    } else {
                        util.createNotification(friend,"removed-friend",{username:req.user.username,full_name:req.user.full_name});
                        res.json({
                            success: true
                        });
                    }
                })
            }
        })
    });

    app.get('/api/moveToFolder', interceptor.isLoggedIn, function(req, res) {
        if (!req.query.mail || !req.query.dest || req.user.folders.indexOf(req.query.dest) == -1) {
            if (req.query.dest != 'permanentDelete') {
                return res.json({
                    success: false
                });
            }
        }
        var done = false;
        req.user.mails.forEach(function(mail, index) {
            if (mail._mail.toString() == req.query.mail) {
                if (req.query.dest == 'permanentDelete') {
                    req.user.mails.pull({
                        _id: mail._id
                    });
                    req.user.save(function(err) {
                        if (done) return;
                        done = true;
                        if (err) {
                            return res.json({
                                success: false
                            });
                        } else {
                            return res.json({
                                success: true
                            });
                        }
                    });
                } else if (mail.folder_name != req.query.dest) {
                    mail.folder_name = req.query.dest;
                    req.user.save(function(err) {
                        if (done) return;
                        done = true;
                        if (err) {
                            return res.json({
                                success: false
                            });
                        } else {
                            return res.json({
                                success: true
                            });
                        }
                    });
                }
            }
        });
    });

    app.get('/api/isActive', function(req, res) {
        if (req.isAuthenticated()) {
            res.json({
                success: true
            });
        } else {
            res.json({
                success: false
            });
        }
    });

    app.post('/api/addCode', interceptor.isLoggedInAPI, function(req, res) {
        var title = req.body.title || '';
        var url = req.body.url || '';
        var desc = req.body.description || '';
        var visib = req.body.visibility || '';
        var lang = req.body.language || '';
        var content = req.body.content || '';
        var message = '';

        var code;

        async.series([
            function(callback) {
                if(title=='' || url=='' || lang=='' || visib==''){
                    //console.log(req.body);
                    callback(new Error('Unknown error occurred while sendng data'));
                }else{
                    callback();
                }
            },function(callback){
                Code.find({owner:req.user._id,url:url},function(err,code){
                    if(err)return callback(err);
                    if(code.length>0){
                        //console.log(code[0]._id + " : " +req.body.id );
                        if(req.body.id==code[0]._id)return callback();
                        message = "The requested url already exists please choose a diifferent one.";
                        callback(new Error(message));
                    }else{
                        callback();
                    }
                });
            },function(callback){
                var newCode = new Code();
                code = newCode;
                if(req.body.id){
                    Code.findOne({_id:req.body.id,owner:req.user._id},function(err,prevCode){
                        if(err || !prevCode)return callback(new Erro("Tampered id"));
                        code = prevCode;
                        callback();
                    });
                }else{
                    callback();
                }
            },
            function(callback) {
                var newCode = code;
                newCode.owner = req.user._id;
                newCode.description = desc;
                newCode.content = content;
                newCode.language = lang;
                newCode.date_created = new Date();
                newCode.visibility = visib;
                newCode.likes = 0;
                newCode.title=title;
                newCode.url = url;
                newCode.views = 0;
                //newCode.comments = [];
                console.log(newCode);
                newCode.save(function(err) {
                    if (err) {
                        callback(err);
                    } else {
                        callback();
                    }
                });
            }
        ], function(err, result) {
            if (err) {
                res.json({
                    success: false,
                    message:message
                });
            } else {

                util.logActivity(req, req.user, {
                    code: code._id
                }, "pb", 'new-code', function(err) {
                    if (err) {
                        res.json({
                            success: false,
                            message:message
                        });
                    } else {
                        if (!req.isAdmin) {
                            req.user.followers.forEach(function(follower) {
                                util.createNotification({
                                    _id: follower
                                }, "following-new-code", {
                                    username: req.user.username,
                                    full_name: req.user.full_name,
                                    code_url: code.url,
                                    code_title: code.title
                                });
                            });
                        } else {
                            User.find({}, function(err, users) {
                                users.forEach(function(follower) {
                                    follower = follower._id;
                                    util.createNotification({
                                        _id: follower
                                    }, "following-new-code", {
                                        username: req.user.username,
                                        full_name: req.user.full_name,
                                        code_url: code.url,
                                        code_title: code.title
                                    });
                                });
                            });
                        }
                        res.json({
                            success: true,
                            message:message
                        });
                    }
                });
            }
        });
    });

    app.post('/api/likeCode', interceptor.isLoggedInAPI, function(req, res) {
        if (!req.body.codeId || req.body.like == undefined) return res.send(500);
        req.body.like = req.body.like == "true";

        console.log(req.user.codesLiked);

        Code.findOne({
            _id: req.body.codeId
        }).populate('owner').exec(function(err, code) {
            if (err) {
                return res.json({
                    success: false
                });
            }
            var liked = util.liked(req.user, code);
            if (liked == req.body.like) {
                return res.json({
                    success: false
                });
            }
            if (liked) {
                var index = -1;
                req.user.codesLiked.forEach(function(likedCode, i) {
                    if (likedCode.toString() == code._id) {
                        index = i;
                    }
                });

                util.deleteAt(req.user.codesLiked, index);
            } else {
                req.user.codesLiked.push(code._id);
            }

            req.user.save(function(err) {
                if (err) {
                    return res.json({
                        success: false
                    });
                } else {
                    code.likes += liked ? -1 : 1;
                    code.save(function(err) {
                        if (err) {
                            return res.json({
                                success: false
                            });
                        } else {
                            Notification.remove({owner:code.owner._id,type:'code-liked','content.code_id':code._id},function(){});
                            util.createNotification(code.owner,"code-liked",{username:code.owner.username,code_id:code._id,likes:code.likes,title:code.title,code_url:code.url});
                            return res.json({
                                success: true
                            });
                        }
                    })
                }
            })
        });
    });

}
