var LocalStrategy = require('passport-local').Strategy;
var User = require('../app/models/user');
var util = require('../app/util.js');

module.exports = function(passport) {

    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
            done(err, user);
        });
    });

    passport.use('local-signup', new LocalStrategy({
            usernameField: 'username',
            passwordField: 'password',
            passReqToCallback: true
        },
        function(req, username, password, done) {
            process.nextTick(function() {
                req.flash('username',username);
                req.flash('full_name',req.body.full_name);
                req.flash('email',req.body.email);
                var error = {field:''}
                var msg = util.validateSignupFields(username,req.body.full_name,req.body.email,req.body.password,error);
                if(msg!='' && msg!=undefined && !req.dev){
                    req.flash('error_field',error.field);
                    return done(null, false, req.flash('signupMessage', msg+req.dev));
                }
                if(req.body.confirmPass!=req.body.password && !req.dev){
                    req.flash('error_field',"password");
                    return done(null, false, req.flash('signupMessage', "Passwords do not match"));
                }
                User.findOne({
                    'username': username
                }, function(err, user) {
                    if (err)
                        return done(err);
                    if (user) {
                        controlRedirectRoute(req);
                        return done(null, false, req.flash('signupMessage', 'That username is already taken.'));
                    }
                    else {
                        var newUser = new User();

                        newUser.username = req.body.username;
                        newUser.full_name = req.body.full_name;
                        newUser.email = req.body.email;
                        newUser.password = newUser.generateHash(password);
                        newUser.date_joined = new Date();
                        newUser.regno = req.body.regno;

                        newUser.save(function(err) {
                            if (err)return done(null, false, req.flash('signupMessage', 'Unknown error occurred'));

                            controlRedirectRoute(req);
                            return done(null, newUser);
                        });
                    }
                });
            });
        }));

    passport.use('local-login', new LocalStrategy({
            usernameField: 'username',
            passwordField: 'password',
            passReqToCallback: true
        },
        function(req, username, password, done) {
            User.findOne({
                'username': username
            }, function(err, user) {
                if (err)
                    return done(err);

                if (!user) {
                    controlRedirectRoute(req);
                    return done(null, false, req.flash('loginMessage', 'Invalid username / password'));
                }
                if (!user.validPassword(password)) {
                    controlRedirectRoute(req);
                    return done(null, false, req.flash('loginMessage', 'Invalid username / password'));
                }
                return done(null, user);
            });

        }));

};

function controlRedirectRoute(req) {
    if (req.vars.redirect != '' && req.vars.redirect != undefined) {
        req.flash('redirect', req.vars.redirect);
    }
    else if (req.body.redirect != undefined) {
        req.flash('redirect', req.body.redirect);
    }
    else if (req.query.redirect != undefined) {
        req.flash('redirect', req.query.redirect);
    }
}