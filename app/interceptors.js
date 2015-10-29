var dateFormat = require('dateformat');
var Notification = require('./models/notification.js');
var User = require('./models/user.js');
var Code = require('./models/code.js');
var cloudinary = require("cloudinary");

module.exports.allRequests = function (app, passport) {
    cloudinary.config({
        cloud_name: 'mdakram28',
        api_key: '987147464891958',
        api_secret: 'zZj6tRaxVCbYzgf_CGMjBc1tN6o'
    });

    app.use(function (req, res, next) {
        req.dev = true;
        req.vars = {
            redirect: req.flash('redirect')
        };

        res.locals.redirect = '/';
        if (req.query.redirect != undefined) {
            res.locals.redirect = req.query.redirect;
        }
        else if (req.body.redirect != undefined) {
            res.locals.redirect = req.body.redirect;
        }
        else if (req.vars.redirect != '' && req.vars.redirect != undefined) {
            res.locals.redirect = req.vars.redirect;
        }
        req.local = res.locals.local = process.env.PORT == undefined;
        res.locals.escape = escape;
        res.locals.style="";
        req.cloudinary = cloudinary;
        res.locals.cloudinary = cloudinary;
        res.locals.req = req;
        res.locals.res = res;
        res.locals.user = req.user;
        res.locals.dateFormat = dateFormat;
        res.locals.btn = undefined;
        res.locals.href = undefined;
        res.locals.includes = [];
        res.locals.folder = res.locals.folderView = req.query.folder || req.query.f || 'inbox';
        res.locals.notifs = [];
        res.locals.notifs_unread = 0;
        res.locals.active = '';
        res.locals.util = require("./util.js");

        req.isAdmin = req.isAuthenticated() && req.user.username == "mdakram28";
        next();
    });

    app.use(function (req, res, next) {
        String.prototype.capitalize = function () {
            return this.charAt(0).toUpperCase() + this.slice(1);
        }
        if (req.isAuthenticated()) {
            res.locals.folders = req.user.folders;
            res.locals.getFolderIcon = getFolderIcon;
        }
        next();
    });

    app.use(function (req, res, next) {
        if (!req.isAuthenticated()) return next();
        Notification.find({ owner: req.user._id }, function (err, notifs) {
            if (err) return res.render("500");
            res.locals.notifs = notifs;
            notifs.sort(function (a, b) {
                return b.date_created.getTime() - a.date_created.getTime();
            });
            notifs.forEach(function (notif) {
                if (!notif.read) {
                    res.locals.notifs_unread++;
                }
            });
            next();
        })
    });

    app.use(function (req, res, next) {
        User.find({}, function (er, users) {
            var done = 0;
            var points = [];
            users.forEach(function (user, index) {
                user.totalLikes = 0;
                Code.find({ owner: user._id }, function (err, codes) {
                    codes.forEach(function (code) {
                        user.totalLikes += code.likes;
                    });
                    done++;
                    if (done >= users.length) {
                        users.sort(function (user1, user2) {
                            return user2.totalLikes - user1.totalLikes;
                        });
                        res.locals.leaderboard = users;
                        next();
                    }
                });
            });
        });
    });
}

module.exports.isLoggedIn = function (req, res, next) {

    if (req.isAuthenticated())
        return next();

    res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
}

module.exports.isLoggedInAPI = function (req, res, next) {
    if (!req.isAuthenticated()) {
        res.send(401);
    } else {
        next();
    }
}

module.exports.totalLikes = function (req, res, next) {
    if (!req.isAuthenticated()) return next();
    Code.find({ owner: req.user._id }, function (err, codes) {
        if (err) {
            res.locals.totalLikes = 0;
            next();
        } else {
            var total = 0;
            codes.forEach(function (code) {
                total += code.likes;
            });
            res.locals.totalLikes = total;
            next();
        }
    });
}

module.exports.insertTopCodes = function (req, res, next) {
    Code.find({}).populate("owner").exec(function (err, codes) {
        codes.sort(function (code1, code2) {
            return (code2.views + code2.likes * 3) - (code1.views + code1.likes * 3);
        });
        res.locals.topCodes = codes.splice(0, 10);
        next();
    });
}

function getFolderIcon(folder) {
    var folders = {
        'inbox': 'inbox',
        'sent': 'envelope-o',
        'draft': 'file-text-o',
        'junk': 'filter',
        'trash': 'trash'
    };
    if (folder in folders) {
        return (folders[folder]);
    }
    else {
        return ('folder-o');
    }
}

function escape(s) {
    if (!s) return "";
    //console.log(s);
    var ret = "";
    for (var i = 0; i < s.length; i++) {
        var ch = s[i];
        if (ch == '\n') {
            ret += "<br>";
        } else {
            ret += ch;
        }
    }
    return ret;
}