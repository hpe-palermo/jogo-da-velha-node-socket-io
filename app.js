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
let socketConnected = {};
let playersConnected = [];
let playersWithoutOpponent = [];
let playersPlayingNow = [];
let rooms = [];

io.on('connection', (socket) => {
    console.log('a user connected');
    // list players connected
    io.emit('list-players', playersWithoutOpponent);

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });

    socket.on('save-nickname', (myNickname, myID_nickname) => {
        // check the nickname
        let myId = -1;
        let accepted = false;
        let state = checkNickname(myNickname);
        if (state == 'Accepted nickname!') {

            // check if nickname is already
            if (myID_nickname == -1) {
                playersConnected.push(myNickname.toLowerCase());
                playersWithoutOpponent.push(myNickname.toLowerCase());
            } else {
                playersConnected[myID_nickname] = myNickname.toLowerCase();
                playersWithoutOpponent[myID_nickname] = myNickname.toLowerCase();
            }

            myId = playersConnected.length - 1;
            console.log('Accepted nickname: ' + myNickname);
            console.log('ID nickname: ' + myId);

            accepted = true;

            rooms.push({
                jogador1: myNickname,
                jogador2: '',
                link: '',
            });
        }

        console.log(playersConnected);
        console.log(playersWithoutOpponent);
        socket.emit('state-nickname', state, accepted, myId);
        io.emit('list-players', playersWithoutOpponent);
    });

    socket.on('delete player', (myID_nickname) => {
        // delete player
        playersConnected.splice(myID_nickname, 1);
        playersWithoutOpponent.splice(myID_nickname, 1);
        io.emit('list-players', playersWithoutOpponent);
    });

    socket.on('play-with', (jogador2, jogador1) => {
        // make a room to two players and remove them from the list playersWithoutOpponent
        let indexJ2 = playersWithoutOpponent.indexOf(jogador2);
        playersWithoutOpponent.splice(indexJ2, 1);

        let indexJ1 = playersWithoutOpponent.indexOf(jogador1);
        playersWithoutOpponent.splice(indexJ1, 1);

        console.log(`${jogador2} entrou na sala com ${jogador1}`);
        console.log(playersWithoutOpponent);

        // make link if room
        console.log('room game');
        let room = rooms.find(room => room.jogador1 == jogador1);
        room.jogador2 = jogador2;
        room.link = `/${jogador1}-${jogador2}`;
        console.log(room);

        // delete room from other player

        io.emit('list-players', playersWithoutOpponent);
    });

    socket.on('unload', (my_nickname) => {
        console.log(`${my_nickname} saiu da sala`);
    });

});

function checkNickname(myNickname) {
    if (!myNickname) {
        // is empty
        return 'Nickname cannot be empty!';
    } else if (playersWithoutOpponent.includes(myNickname.toLowerCase())) {
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
