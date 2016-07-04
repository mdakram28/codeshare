var configDB = require('./config/database.js');
var fs = require("fs");
var mongoose = require('mongoose');
var async = require("async");

var slotMap = {
	A1 : [1,20],
	F1 : [2,14,21],
	C1 : [3,13,22],
	E1 : [4,15,25],
	TD1 : [5],
	B1 : [7,26],
	G1 : [8,27],
	D1 : [9,28],
	TA1 : [10],
	TF1 : [11],
	TE1 : [23],
	TC1 : [29],

	A2 : [31,50],
	F2 : [32,44,51],
	C2 : [33,43,52],
	E2 : [34,45,55],
	TD2 : [35],
	B2 : [37,56],
	G2 : [38,57],
	D2 : [39,58],
	TA2 : [40],
	TF2 : [41],
	TB2 : [46],
	TG2 : [47],
	TE2 : [53],
	TC2 : [59]
}

for (var i = 1; i <= 60; i++) {
	slotMap["L"+i] = [i];
	slotMap[""+i] = [i];
};
console.log(slotMap);

function mapSlotNum(slot){
	//console.log(slot);
	slot = slot.split("+");
	var ret = [];
	for (var i = 0; i < slot.length; i++) {
		ret = ret.concat(slotMap[slot[i]]);
	};
	//console.log(ret);
	return ret;
}

mongoose.connect(configDB.url);
var conn = mongoose.connection;
conn.once('open', function() {
	var Course = require("./app/models/timetable.js");
	var lines = fs.readFileSync("D:/all_slots_new.txt").toString().split('\n');
	var count=0;
	var len = lines.length;
	function forEachLine(ind){
		if(ind==len)return done();
		if(lines[ind]=="" || !lines[ind])return forEachLine(ind+1);
		var param = lines[ind].split("\t");
		if(param[11]=="NIL" || param[13]==""){
			return forEachLine(ind+1);
		}
		var course = {
			code : param[0],
			title : param[1],
			type : param[2],
			credit : parseInt(param[7])
		};
		var slot = {
			slots : param[11],
			slotNums : mapSlotNum(param[11]),
			classes : []
		};
		var cl = {
			_id : parseInt(param[10],10),
			venue : param[12],
			faculty : param[13]
		}

		Course.findOne({id: course.code+" "+course.type},function(err,c){
			if(!c){
				c = new Course();
				c.id = course.code+" "+course.type;
				c.code = course.code;
				c.title = course.title;
				c.type = course.type;
				c.credit = course.credit;
				c.slots = [];
			}
			var s = undefined;
			for (var i = 0; i < c.slots.length; i++) {
				if(c.slots[i].slots==slot.slots){
					s = c.slots[i];
				}
			};
			if(!s){
				//console.log(slot);
				if(c.slots==undefined)c.slots = [];
				var i = c.slots.push(slot);
				s = c.slots[i-1];
			}
			s.classes.push(cl);

				//console.log(c);
			c.save(function(err){
				if(err){
					console.log(err);
					throw err ;
				}
				printProgress((++count*100)/len,count);
				forEachLine(ind+1);
			});
		});
	};
	Course.remove({},function(){
		forEachLine(0);
	});
	function done(){
		console.log("Complete")
	}
	//console.log(lines);
});
var prev = -1;

function printProgress(p,count){
	p = Math.floor(p);
	if(prev==p)return;
	prev = p;
	console.log(count);
	console.log("##############################################################################################################".substring(0,p) 
		+ "                                                                                                              ".substring(0,100-p)
		+ "| "
		+ p + "%"
		+ "\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n");
}