'use strict';

var express = require('express'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    fs = require('fs'),
    path = require('path'),
    kill = require('tree-kill'),
    cp = require('child_process'),
    motion,
    Camelittle = require('camelittle'),
    clInstance = new Camelittle({
        resolution: '640x480',
        'no-banner': null,
        frames: 1
    });

app.use('/', express.static(path.join(__dirname, 'stream')));
app.get('/', function(req, res) {
    res.sendFile(__dirname + '/index.html');
});

var sockets = {};
io.on('connection', function(socket){
    socket.on('capture-image', function(){
        kill(motion.pid, 'SIGKILL', function(err){
            clInstance.grab(function(err, image){
                fs.writeFile('./stream/image.jpg', image, 'binary', function(){
                    motion = cp.spawn('motion');
                    setTimeout(function(){socket.emit('refresh');}, 800);
                });
            });
        });
    });
});

http.listen(3000, function() {
    console.log('listening on *:3000');
    motion = cp.spawn('motion');
});