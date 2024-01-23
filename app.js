const express = require('express');
const http = require('http');
const { join } = require('path');
const { Server } = require('socket.io');
const { router } = require('./router');
const { Socket } = require('engine.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));
app.use(express.static(join(__dirname, 'public')));
app.use('/', router);

let namespacePartida;
let playersConnected = ['Joao']; // delete this name, became this liist empty!
let socketConnected = {};

io.on('connection', (socket) => {
    console.log('a user connected');
    // list players connected
    io.emit('list-players', playersConnected);

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });

    socket.on('save-nickname', (myNickname, myID_nickname) => {
        // check the nickname
        let myId = -1;
        let state = checkNickname(myNickname);
        if (state == 'Accepted nickname!') {


            // check if nickname is already
            if (myID_nickname == -1) {
                playersConnected.push(myNickname.toLowerCase());
            } else {
                playersConnected[myID_nickname] = myNickname.toLowerCase();
            }

            myId = playersConnected.length - 1;
            console.log('Accepted nickname: ' + myNickname);
            console.log('ID nickname: ' + myId);

            io.emit('list-players', playersConnected);
        };
        socket.emit('state-nickname', state, myId);
    });

});

function checkNickname(myNickname) {
    if (!myNickname) {
        // is empty
        return 'Nickname cannot be empty!';
    } else if (playersConnected.includes(myNickname.toLowerCase())) {
        // already exists
        return 'This nickname already exists!';
    } else {
        // accepted
        return "Accepted nickname!";
    }
}

server.listen(3000, () => {
    console.log('listening on http://localhost:3000');
});
