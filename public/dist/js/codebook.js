var socket = io();
var app = angular.module('mailApp',[]);
var scope,http;
var run = false;
$('body').addClass('sidebar-collapse');
function startLoading(){
    $('#refreshing-icon').removeClass('hidden');
}
function endLoading(){
    $('#refreshing-icon').addClass('hidden');
}
function quickRun(){
    if(scope.mails==undefined) return setTimeout(quickRun,1000);
    var change = false;
    scope.mails.forEach(function(mail){
        var disp;
        var date_sent = new Date(mail._mail.date_sent);
        var now = new Date();
        
        var diffTime = Math.abs(now.getTime() - date_sent.getTime());
        var days = Math.ceil(diffTime / (1000 * 3600 * 24));
        
        diffTime = Math.ceil(diffTime/1000);
        var hrs = Math.floor(diffTime/3600);
        var min = Math.floor((diffTime-(hrs*3600))/60)
        var sec = diffTime -( hrs*3600 + min*60);
        if(days>2){
            disp = date_sent.format("DD / MM / YYYY");
        }
        else if(hrs>20){
            disp = days+" day"+(days==1?'':'s')+" ago";
        }else if(hrs>=3){
            disp = moment(date_sent).format("hh : mm : ss a");
        }else if(hrs>=1){
            disp = hrs+" hour"+(hrs==1?'':'s')+" ago";
        }else if(min>=1){
            disp = min+" minute"+(min==1?'':'s')+" ago";
        }else{
            disp = sec+" second"+(sec==1?'':'s')+" ago"
        }
        if(mail.diffDate!=disp){
            change = true;
        }
        mail.diffDate = disp;
    });
    if(change && !scope.$$phase){
            scope.$apply();
    }
    setTimeout(quickRun,3000);
}
    
function getUnreadMails($scope,$http,callback){
    $http.get('/api/unreadMails').then(function(res){
        if(!res.data.success){
            $.notify("Some error occurred .","error");
            $scope.folders = [];
            $scope.total = [];
        }
        else{
            $scope.folders = res.data.folders;
            $scope.total = res.data.total;
        }
        if(callback!=undefined)callback();
    },function(res){
        $.notify('Unable to fetch unread mails !! please try again later','error');
        if(callback!=undefined)callback();
    });
}

function getMails($scope,$http,folder,callback){
    if(!folder || folder=='')folder = 'inbox';
    $http.get('/api/mails?folder='+folder+"&off="+scope.offset+"&lim="+scope.limit).then(function(response){
        if(!response.data.success){
            $.notify("Some error occurred . Unable to fetch mails","error");
            $scope.mails = [];
            $scope.unread = [];
        }
        else{
            $scope.mails = response.data.mails;
            $scope.unread = response.data.unread;
        }
        if(callback!=undefined)callback();
    },function(response){
        $.notify('Unable tp fetch mails ... Please reload after some time','error');
        if(callback!=undefined)callback();
    });
}

function sendMailToFolder($scope,$http,mail,folder,callback){
    //console.log(mail);
    $http.get('/api/moveToFolder?mail='+mail._mail._id+"&dest="+folder).then(function(response){
        if(!response.data.success){
            callback(new Error('Some Error occurred'));
        }
        else{
            callback();
        }
    },function(response){
        callback(new Error('Some Error occurred'));
    });
}

function refresh(callback){
    startLoading();
    getUnreadMails(scope,http,function(){
        getMails(scope,http,folder,function(){
            endLoading();
            if(!scope.$$phase){
                scope.$apply();
            }
            if(callback!=undefined)callback();
        });
    });
    
}
function runForeverIsActive(){
    $http.get('/api/isActive').then(function(res){
        if(!res.data.success){
            $.notify('Connection lost or session ended. Please log in to continue','error');
        }
        setTimeout(runForever,30000);
    },function(res){
        $.notify('Connection lost or session ended. Please log in to continue','error');
        setTimeout(runForever,30000);
    })
}

$(function(){
    $('<div class="alerts-holder"></div>').prependTo('body');
});

$.notify = function(msg,type){
    type = type || 'success';
    
    var temp = $('<div  style="margin-top:-52px" class="alert-box '+type+'" >'+msg+'<a href="#" onClick="closeAlert(this)" class="pull-right"><b>X</b></a></div>')
    .prependTo('.alerts-holder')
    .delay(2000)
    .fadeOut(1000, function() {
        $(this).remove();
    });
    setTimeout(function(){
        temp.css("margin-top","0");
    },1);
}

function closeAlert(obj){
    obj.parentNode.remove();
}

app.controller('mailController',function($scope,$http,$controller,$httpParamSerializerJQLike,$window){
    //$.notify.defaults({ className: "success" , position: "top"});
    scope = $scope;
    http=$http;
    $scope.offset = 0;
    $scope.limit = 20;
    $scope.folder = folder;
    $scope.notifs_unread = notifs_unread;

    $scope.readNotifications = function(){
        $http.get('/api/readNotifications');
        $scope.notifs_unread = 0;
    }
    refresh(function(){
        quickRun();
    });

    socket.emit('register',id);
    socket.on('disconnect',function(data){
        $.notify("Connection lost. Trying to reconnect","error");
    });
    socket.on('newMail',function(data){
        getUnreadMails($scope,$http);
        getMails($scope,$http);
    });
    socket.on('loggedOut',function(data){
        $window.location.href = "/logout?redirect="+originalUrl;
    });

    angular.extend(this, $controller('mailController2', {$scope: $scope, $http: $http, $httpParamSerializerJQLike: $httpParamSerializerJQLike, $window: $window}));
});