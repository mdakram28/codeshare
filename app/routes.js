var util = require("./util.js");
var interceptor = require("./interceptors.js");

module.exports = function(app, passport, sockets) {

    app.get('/dashboard', interceptor.isLoggedIn, interceptor.track, interceptor.totalLikes ,function(req, res) {
        res,render("dashboard");
    });

    app.get('/',interceptor.insertTopCodes, interceptor.track, function(req,res){
        if(!req.isAuthenticated()){
            res.render("anonymous/home");
        }else{
            interceptor.totalLikes(req,res,function(){
                res.render("dashboard");
            });
        }
    });

    app.get("/home", interceptor.track,function(req,res){
        res.render("anonymous/home");
    });

    app.get('/login', interceptor.track, function(req, res) {
        /*var redir = '/';
        
        if(req.redir!=undefined){
            redir = req.redir;
        }*/
        
        res.render('login.ejs', {
            message: req.flash('loginMessage'),
            /*redirect: redir*/
        });
    });

    app.post('/login', interceptor.track, passport.authenticate('local-login', {
        failureRedirect: '/login'
    }), function(req, res) {
        require("./redirect-handler.js")(req, res);
    });
    
    app.get('/logout', interceptor.track,function(req, res) {
        if(req.user!=undefined){
            sockets.notifyLogout(req.user);
        }
        req.logout();
        req.session.destroy();
        require("./redirect-handler.js")(req, res);
    });

    app.get('/register', interceptor.track, function(req, res) {        
        
        res.render('register.ejs', {
            message: req.flash('signupMessage'),
            error_field:req.flash('error_field'),
            username:req.flash('username'),
            full_name:req.flash('full_name'),
            email:req.flash('email')
        });
    });

    app.post('/register', interceptor.track, passport.authenticate('local-signup', {
        failureRedirect: '/register',
        failureFlash: true
    }),function(req,res){
        require("./redirect-handler.js")(req,res);
    });


    app.get('/logout', interceptor.track, function(req, res) {
        req.logout();
        require("./redirect-handler.js")(req,res);
    });
};