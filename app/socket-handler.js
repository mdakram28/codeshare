var User = require("./models/user.js")
var io;
var pool;
module.exports.init = function(app, io_t, pool_t) {
	io = io_t;
	pool = pool_t;
    io.on('connection', function(socket) {
        //console.log('a user connected : ');
        socket.on('register', function(userId) {
    		User.findOne({_id:userId},function(err,user){
    			if(err)throw err;
				//console.log(user);
    			pool.addSocket(socket,user);
    		});
        });
        socket.on('disconnect', function() {
        	pool.removeSocket(socket);
        });
    });
}

module.exports.notifyUnread = function(user){
	var conns = pool.sockets[user._id.toString()];
	if(!conns){
	    return;
	}
	conns.forEach(function(conn){
		conn.emit('newMail',{reload:true});
	});
}

module.exports.notifyLogout = function(user){
	var conns = pool.sockets[user._id.toString()];
	if(!conns){
	    return;
	}
	conns.forEach(function(conn){
		conn.emit('loggedOut',{reload:true});
	});
}
