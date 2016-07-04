var fs = require("fs");
var Mail = require("./models/mail.js");
var User = require("./models/user.js");
var Code = require("./models/code.js");
var Notification = require("./models/notification.js");
var async = require("async");
var interceptor = require("./interceptors.js");
var util = require("./util.js");
var request = require("request");
var Course = require("./models/timetable.js");
var express = require("express");
var g_req;

module.exports = function(mainApp, passport, sockets) {
	var app = express.Router();
	app.get('/generate',interceptor.isLoggedInAPI, interceptor.track,function(req,res){
		User.findOne({
            username: req.user.username
        }).populate('courses').exec(function (err, user) {
        	generate(user.courses,function(tts){
        		console.log(tts);
        	});
        });
        res.json({success:true});
	});
	app.get('/courses',interceptor.isLoggedIn, interceptor.track,function(req,res){
		var selectedStrings = [];
		User.findOne({
            username: req.user.username
        }).populate('courses').exec(function (err, user) {
        	if(err)return res.render("500");
			res.locals.selected = user.courses;
			user.courses.forEach(function(course){
				selectedStrings.push(course.id);
			});
			Course.find({},function(err,courses){
				res.locals.courses = courses;
				var courseNames = [];
				courses.forEach(function(course,i){
					if(selectedStrings.indexOf(course.id)>=0)return;
					courseNames.push({
	                        id: i,
	                        course: course.code+" "+course.type,
	                        title: course.title+" "+course.type
	                    });
				});
				res.locals.courseNames = courseNames;
				res.render("timetable-courses");
			});
        });
		
	});

	app.get('/make',interceptor.isLoggedIn,interceptor.track,function(req,res){
		User.findOne({
            username: req.user.username
        }).populate('courses').exec(function (err, user) {
        	if(err)return res.render("500");
        	res.locals.courses = user.courses;
			res.render("timetable-make");
        });
	});
	app.get('/removeCourse',interceptor.isLoggedInAPI,function(req,res){
		var id = req.query.id || "";
		User.findOne({username:req.user.username}).populate('courses').exec(function(err,user){
			for (var i = 0; i < user.courses.length; i++) {
				if(user.courses[i].id==id){
					user.courses.splice(i,1);
					return user.save(function(err){
						res.redirect('courses');
					});
				}
			};
			return res.render("500");
		});
	});
	app.post('/addCourse',interceptor.isLoggedInAPI,function(req,res){
		var courses = !req.body.courses.length ? [req.body.courses] : req.body.courses;
		g_req = req;
		async.forEachSeries(courses,function(course,callback){
			addCourse(course,callback,function(){
				return res.render("500");
			});
		},function(err){
			res.redirect("courses");
		});
	});

	mainApp.use('/timetable',app);
}

function generate(courses,done){
	var tts = [];
	var count = 0;
	var slots=[];
	for (var i = 0; i < courses.length; i++) {
		slots[i] = undefined;
	};
	function clash(ind,cl){
		var len = cl.slotNums.length;
		for (var i = 0; i < len; i++) {
			var sn = cl.slotNums[i];
			for (var j = 0; j < ind; j++) {
				if(slots[j].slotNums.indexOf(sn)>=0)return true;
			};
		};
		return false;
	}
	function iterate(i){
		if(i==courses.length){
			tts[count] = [];
			for (var j = 0; j < slots.length; j++) {
				tts[count][j] = slots[j];
			};
			count++;
			console.log(count);
			return;
		}
		for (var sl = 0; sl < courses[i].slots.length; sl++) {
			if(clash(i,courses[i].slots[sl]))continue;
			slots[i] = courses[i].slots[sl];
			iterate(i+1);
		};
		if(i==0)done(tts);
	}
	iterate(0);
}

function addCourse(courseName,done,failed){
	console.log(courseName);
	var cn = courseName.split(" ");
	var code = cn[0];
	var type = cn[1];
	Course.findOne({id:courseName},function(err,course){
		if(!course){
			console.log("Course does not exist");
			return failed();
		}
		User.findOne({username:g_req.user.username}).populate('courses').exec(function(err,user){
			var fail = false;
			user.courses.forEach(function(cour){
				if(cour.id==courseName){
					console.log("duplicate course");
					fail = true;
					return;
				}
			});
			if(fail==true)return failed();
			g_req.user.courses.push(course);
			g_req.user.save(function(err){
				if(err)return failed();
				done();
			});
		})
	});
}