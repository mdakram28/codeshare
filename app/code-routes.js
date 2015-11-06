var fs = require("fs");
//var Folder = require("./models/folder.js");
var Mail = require("./models/mail.js");
var User = require("./models/user.js");
var Code = require("./models/code.js");
var async = require("async");
var interceptor = require("./interceptors.js");
var util = require("./util.js");
var config = require("../config/code.js");

module.exports = function(app, passport, sockets) {

    app.get('/code/:username/:codeUrl',interceptor.track,function(req,res){
    	var owner;
    	async.series([function(callback){
    		User.findOne({username:req.params.username},function(err,user){
    			if(err){
    				callback(err);
    			}
    			else if(!user){
    				callback(new Error("User not found"));
    			}
    			else{
    				owner = user;
    				callback();
    			}
    		});
    	},function(callback){
    		Code.findOne({owner:owner._id,url:req.params.codeUrl}).populate('comments.commentor owner').exec(function(err,code){
    			if(err){
    				callback(err);
    			}else if(!code){
    				callback(new Error("Code not found"));
    			}else{
                    // if(code.comments == null){
                    //     code.comments = [];
                    // }
    				res.locals.code = code;
    				res.locals.owner = owner;
    				res.locals.liked = util.liked(req.user,code);
    				util.isEligible(code,req.user,owner,callback);
    			}
    		});
    	},function(callback){
            res.locals.code.views = res.locals.code.views || 0;
            res.locals.code.views++;
            res.locals.code.save();
            callback();
        }],function(err,result){
    		if(err){
    			res.render("500");
    		}else{
    			res.render("view-code");
    		}
    	});
    });
    
    app.get('/newcode', interceptor.isLoggedIn, interceptor.track, function(req,res){
    	res.locals.languages = config.languages;
        res.locals.code = undefined;
        res.render('new-code');
    });

    app.get('/editCode',interceptor.isLoggedIn, interceptor.track,function(req,res){
        if(!req.query.id)return res.render("500");
        Code.findOne({_id:req.query.id,owner:req.user._id},function(err,code){
            if(err || !code)return res.render("500");
            res.locals.code = code;
            res.locals.languages = config.languages;
            res.render('new-code');
        });
    });

    app.get('/codes', interceptor.track, function(req,res){
        var username = req.query.user;
        if(req.user){
            username = req.query.user || req.user.username;
        }
        if(!username){
            return res.render("500");
        }
        var owner;
        async.series([
            function(callback){
                User.findOne({username:username},function(err,userT){
                    if(err || !username) return callback(new Error("sdfsdf"));
                    owner = userT;
                    callback();
                });
            },function(callback){
                Code.find({owner:owner._id}).populate('owner').exec(function(err,codes){
                    var visibleCodes = [];
                    async.each(codes,function(code,callback2){
                        util.isEligible(code,req.user,owner,function(err){
                            if(!err){
                                switch(code.visibility){
                                    case 'pb': code.visibility = "public";break;
                                    case 'ff': code.visibility = "Friends of Friends";break;
                                    case 'fr': code.visibility = "Friends";break;
                                    case 'pt': code.visibility = "Private";break;
                                }
                                code.views = code.views || 0;
                                visibleCodes.push(code);
                                callback2();
                            }
                        })
                    },function(err,result){
                        res.locals.codes = visibleCodes;
                        callback();
                    });
                })
            }],function(err,result){
            if(err){
                res.render("500");
            }else{
                res.render("codes");
            }
        })
    });

    app.get('/removeCode', interceptor.track,function(req,res){
        var end = function(){require("./redirect-handler.js")(req, res);}
        if(req.isAuthenticated()){
            var id = req.query.id;
            if(!id)return end();
            Code.findOne({_id:id}).populate('owner').exec(function(err,code){
                if(err)return end();
                if(!code)return end();
                if(code.owner.username != req.user.username)return end();
                Code.remove({_id:code._id},function(err){
                    end();
                });
            });
        }else{
            end();
        }
    });

    app.post('/postComment', interceptor.track,function(req,res){
        var end = function(){require("./redirect-handler.js")(req, res);}
        if(req.isAuthenticated()){
            req.body.content = req.body.content || '';
            if(!req.body.id) return end();
            Code.findOne({_id:req.body.id},function(err,code){
                if(err)return end();
                code.comments.push({
                    commentor:req.user._id,
                    content:req.body.content,
                    date_commented:new Date()
                });
                code.save(function(err){
                    end();
                });
            });
        }else{
            end();
        }
    });
}