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
let rooms = [];

io.on('connection', (socket) => {
    console.log('a user connected');
    // list players connected
    io.emit('list-players', playersWithoutOpponent);

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });

    socket.on('getMyId', (_) => {
        socket.emit('getMyId', socket.id);
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

            socketConnected[myNickname] = socket.id;
            console.log(socketConnected);
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
        let roomUpdate = rooms.filter(room => room.jogador1 != jogador2);
        rooms = roomUpdate;
        console.log(rooms);

        // access the link room
        makeLinkRoom(room.link, jogador1, jogador2);

        io.emit('list-players', playersWithoutOpponent);

        // send the link to both players
        io.to(socketConnected[jogador1]).emit('access-link-room', room.link);
        io.to(socketConnected[jogador2]).emit('access-link-room', room.link);

    });

    socket.on('unload', (my_nickname) => {
        console.log(`${my_nickname} saiu da sala`);

        let index = playersConnected.indexOf(my_nickname);
        playersConnected.splice(index, 1);

        index = playersWithoutOpponent.indexOf(my_nickname);
        playersWithoutOpponent.splice(index, 1);

        io.emit('list-players', playersWithoutOpponent);
    });

    socket.on('can i stay here', (link, cookie) => {
        console.log('checking permission... ');
        let name = cookie.split('=')[1];
        if (link.includes(name)) {
            socket.emit('can i stay here', true);
            playersConnected.push(name);
            socketConnected[name] = socket.id;
            console.log('reconnecting... ');
            console.log('reconnected: ' + name);
        } else {
            socket.emit('can i stay here', false);
        }
    });

    // settings of match =================================
    socket.on('creator-in-room', (nameRoom, jogador1, jogador2) => {
        // join jogador1 in room
        socket.join(nameRoom);
        console.log('Sockets in room ' + nameRoom + ':', io.sockets.adapter.rooms.get(nameRoom));
        console.log(jogador1 + ' in room');

        // invite jogador2 to room
        console.log('waiting the next player...');
        socket.to(socketConnected[jogador2]).emit('invite player2', nameRoom);
    });

    socket.on('player2-in-room', (nameRoom, jogador1, jogador2) => {
        // join jogador2 in room
        socket.join(nameRoom);
        console.log('Sockets in room ' + nameRoom + ':', io.sockets.adapter.rooms.get(nameRoom));
        console.log(jogador2 + ' in room');

        console.log('nameRoom: ' + nameRoom);
        console.log('jogador1:' + jogador1);
        console.log('jogador2:' + jogador2);
        console.log('idJogador1:' + socketConnected[jogador1]);
        console.log('idJogador2:' + socketConnected[jogador2]);
        socket.to(socketConnected[jogador1]).emit('joined-in-room', 'Welcome to room players!!!');
        socket.emit('joined-in-room', 'Welcome to room players!!!');
    });

    socket.on('whoPlayNow', (whoPlayNow, whoPlayed, clickedHouse, player1, player2) => {
        whoPlayNow = whoPlayNow == "X" ? "O" : "X";
        let receivedId;
        if (whoPlayed == player1) {
            receivedId = socketConnected[player2];
        } else {
            receivedId = socketConnected[player1];
        }
        socket.to(receivedId).emit('whoPlayNow', whoPlayNow, clickedHouse);
        socket.emit('whoPlayNow', whoPlayNow, clickedHouse);
    });

    socket.on('change turn and show', (whoPlayNow, player1, player2) => {
        whoPlayNow = whoPlayNow == "X" ? "O" : "X";
        let receivedId;
        if (socket.id == socketConnected[player1]) {
            receivedId = socketConnected[player2];
        } else {
            receivedId = socketConnected[player1];
        }
        socket.to(receivedId).emit('change turn and show', whoPlayNow);
        socket.emit('change turn and show', whoPlayNow);
    });

});

function makeLinkRoom(linkRoom, player1, player2) {
    app.get(linkRoom, (req, res) => {
        // set link room
        res.render('partida', { player1: player1, player2: player2 });
    });
}

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
