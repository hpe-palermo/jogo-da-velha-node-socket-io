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

let room_ply1_ply2 = {};
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

        for (const key in room_ply1_ply2) {
            if (key.includes(my_nickname)) {
                // delete this
                delete room_ply1_ply2[key];
            }
        }

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

    socket.on('player2-in-room', (nameRoom, player1, player2) => {
        // join jogador2 in room
        socket.join(nameRoom);
        console.log('Sockets in room ' + nameRoom + ':', io.sockets.adapter.rooms.get(nameRoom));
        console.log(player2 + ' in room');

        console.log('nameRoom: ' + nameRoom);
        console.log('jogador1:' + player1);
        console.log('jogador2:' + player2);
        console.log('idJogador1:' + socketConnected[player1]);
        console.log('idJogador2:' + socketConnected[player2]);

        let key = `${player1}-${player2}`;
        room_ply1_ply2[key] = { table: ['', '', '', '', '', '', '', '', ''], whoPlayNow: 'X' }

        socket.to(socketConnected[player1]).emit('joined-in-room', 'Welcome to room players!!!');
        socket.emit('joined-in-room', 'Welcome to room players!!!');
    });

    socket.on('whoPlayNow', (clickWhere, player1, player2, symbol, whoPlayNow, numCellClicked) => {
        console.log('clickWhere ' + clickWhere)
        if (whoPlayNow == symbol) {
            let receivedId;
            let table;

            if (socket.id == socketConnected[player1]) console.log(`${player1} check ${clickWhere}`);
            else console.log(`${player2} check ${clickWhere}`);

            let key = `${player1}-${player2}`;
            if (!room_ply1_ply2[key].table[clickWhere - 1]) room_ply1_ply2[key].table[clickWhere - 1] = whoPlayNow;
            table = room_ply1_ply2[key].table;
            whoPlayNow = whoPlayNow == 'X' ? 'O' : 'X';

            console.log('table -------');
            console.log(table);

            let won = checkVictory(table);

            if (socket.id == socketConnected[player1]) receivedId = socketConnected[player2];
            else receivedId = socketConnected[player1];

            numCellClicked++;

            socket.to(receivedId).emit('whoPlayNow', clickWhere, whoPlayNow, table, won, numCellClicked);
            socket.emit('whoPlayNow', clickWhere, whoPlayNow, table, won, numCellClicked);
        }
    });

    socket.on('draw', (player1, player2, namePlayerCookie) => {
        let receivedId;

        if (socket.id == socketConnected[player1]) receivedId = socketConnected[player2];
        else receivedId = socketConnected[player1];

        socket.to(receivedId).emit('draw', 'draw');
        socket.emit('draw', 'draw');
    });

});

function checkVictory(table) {
    // problem here ============================================
    let line = ['line', false, -1];
    let column = ['column', false, -1];
    let diagonal = ['diagonal', false, -1];

    // won line ?
    let auxSymbol = '';
    let auxNum = 0;
    let contLine = -1;
    if ((table[0] == table[1] && table[1] == table[2]) && (table[2] == 'X' || table[2] == 'O')) {
        contLine = 0;
    } else if ((table[3] == table[4] && table[4] == table[5]) && (table[5] == 'X' || table[5] == 'O')) {
        contLine = 1;
    } else if ((table[6] == table[7] && table[7] == table[8]) && (table[8] == 'X' || table[8] == 'O')) {
        contLine = 2;
    }
    if (contLine != -1) {
        line[1] = true;
        line[2] = contLine;
        return line;
    }

    // won column ?
    let contColumn = -1;
    if ((table[0] == table[3] && table[3] == table[6]) && (table[6] == 'X' || table[6] == 'O')) {
        contColumn = 0;
    } else if ((table[1] == table[4] && table[4] == table[7]) && (table[7] == 'X' || table[7] == 'O')) {
        contColumn = 1;
    } else if ((table[2] == table[5] && table[5] == table[8]) && (table[8] == 'X' || table[8] == 'O')) {
        contColumn = 2;
    }
    if (contColumn != -1) {
        column[1] = true;
        column[2] = contColumn;
        return column;
    }

    // won diagonal 1 or 2 ?
    let d1, d2;
    d1 = (
        table[0] == table[4] && table[4] == table[8] &&
        (table[4] == 'X' || table[4] == 'O')
    );
    d2 = (
        table[6] == table[4] && table[4] == table[2] &&
        (table[4] == 'X' || table[4] == 'O')
    );
    if (d1) {
        diagonal[1] = true;
        diagonal[2] = 0;
        return diagonal;
    } else if (d2) {
        diagonal[1] = true;
        diagonal[2] = 1;
        return diagonal;
    }
}

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