var http = require('http');
var express = require('express');
var app = express();
var port = process.env.PORT || 8080;
var mongoose = require('mongoose');
var passport = require('passport');
var flash = require('connect-flash');
var moment = require('moment');

var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var fs = require("fs");
var Grid = require('gridfs-stream');

var server = http.createServer(app);
var configDB = require('./config/database.js');
var pool = require('./app/connection-pool.js');
// configuration ===============================================================
mongoose.connect(configDB.url);
Grid.mongo = mongoose.mongo;
var conn = mongoose.connection;
conn.once('open', function() {
    var gfs = Grid(conn.db);
    app.locals.gfs = gfs;
});

require('./config/passport.js')(passport);
console.log(__dirname);

app.use('/uploads', express.static(__dirname + "/uploads"));
app.use(express.static('public'));
app.use(morgan('dev')); // logging
app.use(cookieParser()); // cookies
app.use(bodyParser()); // html forms info

app.set('view engine', 'ejs');

// required for passport
app.use(session({
    secret: 'mynameismohdakramansari'
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

var io = require('socket.io').listen(server);

require('./app/interceptors.js').allRequests(app, passport);
var socketHandler = require('./app/socket-handler.js');
socketHandler.init(app, io, pool);
// routes ======================================================================
require('./app/routes.js')(app, passport, socketHandler);
require("./app/user-routes.js")(app, passport, socketHandler);
require("./app/api-routes.js")(app, passport, socketHandler);
require("./app/code-routes.js")(app, passport, socketHandler);

// launch ======================================================================
server.listen(port);
console.log("Configured git to work on cloud9 and local machine");
console.log('Running server on port : ' + port);