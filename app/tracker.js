var Pageview = require("./models/pageview.js");

module.exports.intercept = function(req,res,next){
	if(req.tracked)return next();
	var url = req._parsedOriginalUrl.pathname;
	
	if(url.indexOf("/code/")==0){
		url = "/code/"
	}else if(url.indexOf("/users/")==0){
		url = "/users/";
	}
	
	var method = req.method;
	Pageview.findOne({url:url,method:method},function(err,view){
		if(view==undefined){
			view = new Pageview();
			view.url = url;
			view.method = method;
			view.count = 0;
			view.details = {};
			view.details.authenticated = 0;
			view.details.non_authenticated = 0;
		}
		if(req.isAuthenticated()){
			view.details.authenticated+=1;
		}else{
			view.details.non_authenticated+=1;
		}
		view.count++;
		view.save();
	});
	req.tracked = true;
	next();
}