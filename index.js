'use strict';

var express = require('express'),
    app = express(),
    http = require('http').Server(app),
    io = require('socket.io')(http),
    fs = require('fs'),
    path = require('path'),
    kill = require('tree-kill'),
    cp = require('child_process'),
    mqtt = require('mqtt'),
    motion, mqttClient, currentSocket,
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

function sendImage() {
    kill(motion.pid, 'SIGKILL', function(err) {
        if (!err) {
            clInstance.grab(function(err, image) {
                if (!err) {
                    fs.writeFile('./stream/image.jpg', image, 'binary', function() {
                        motion = cp.spawn('motion');
                        currentSocket.emit('refresh');

                        fs.readFile('./stream/image.jpg', function(err, data) {
                            if (err) {
                                console.error(err);
                            } else {
                                var image = new Buffer(data).toString('base64');

                                mqttConnect();

                                mqttClient.publish('reekoh/data', JSON.stringify({
                                    image: image
                                }), function() {
                                    console.log('sent');
                                });
                            }
                        });
                    });
                } else
                    console.error(err);
            });
        } else
            console.error(err);
    });
}

function mqttConnect(){
    mqttClient = mqtt.connect('mqtt://iotexpo.reekoh.com:19001', {
        clientId: 'raspi1',
        keepalive: 64800
    });

    mqttClient.subscribe('raspi1');

    mqttClient.on('message', function(topic, payload) {
        if (payload.toString() === 'capture-image') {
            currentSocket.emit('commandReceived');
            mqttClient.end();
            sendImage();
        }
    });
}

io.on('connection', function(socket) {
    currentSocket = socket;
    socket.on('capture-image', function() {
        mqttClient.end();
        sendImage();
    });
});

http.listen(3000, function() {
    console.log('listening on *:3000');
    motion = cp.spawn('motion');

    mqttConnect();
});