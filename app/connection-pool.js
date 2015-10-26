var sockets = {};
module.exports.sockets = sockets;
module.exports.addSocket = function(socket, user) {
	var prev = sockets[user._id.toString()];
	if(!prev){
		sockets[user._id.toString()] = [socket];
	}
	else{
		sockets[user._id.toString()].push(socket);
	}
}

module.exports.removeSocket = function(socket){
	var c;
	for(c in sockets){
		if(sockets[c].indexOf(socket)>=0){
			sockets[c].splice(sockets[c].indexOf(socket),1);
			return true;
		}
	}
	return false;
}

module.exports.hasSocket = function(socket){
	var c;
	for(c in sockets){
		if(sockets[c].indexOf(sockets)>=0){
			return true;
		}
	}
	return false;
}