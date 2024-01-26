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
app.use((req, res, next) => {
    res.status(404).sendFile(join(__dirname, 'public', '404.html'));
    next();
});

let room_ply1_ply2 = {};
let socketConnected = {};
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

    socket.on('getMyId', (name) => {
        if (name)
            socketConnected[name] = socket.id;
        console.log('socketConnected ==============\n' + JSON.stringify(socketConnected));
        socket.emit('getMyId', socket.id);
    });

    socket.on('save-nickname', (myNickname) => {
        // check the nickname
        let state = checkNickname(myNickname);

        if (state[1]) {
            // Accepted nickname

            // already exists this socket.id
            for (const namePlayer in socketConnected) {
                if (socket.id == socketConnected[namePlayer]) {
                    delete socketConnected[namePlayer];

                    let index = playersWithoutOpponent.indexOf(namePlayer);
                    playersWithoutOpponent.splice(index, 1);

                    let indexRoom = rooms.indexOf(room => room.jogador1 === namePlayer);
                    rooms.splice(indexRoom, 1);
                    break;
                };
            }

            // don't exists this socket.id
            console.log('-----------------------');
            console.log('Accepted nickname: "' + myNickname + '"');
            console.log('-----------------------\n');

            playersWithoutOpponent.push(myNickname);

            socketConnected[myNickname] = socket.id;

            rooms.push(
                {
                    jogador1: myNickname,
                    jogador2: '',
                    link: '',
                }
            );
        } else {
            // Refused nickname
            console.log('-----------------------');
            console.log('Refused nickname: "' + myNickname + '"');
            console.log('-----------------------\n');
        }

        socket.emit('state-nickname', state);
        io.emit('list-players', playersWithoutOpponent);
    });

    socket.on('delete player', (my_nickname) => {
        // delete player
        let index = playersWithoutOpponent.indexOf(my_nickname);
        playersWithoutOpponent.splice(index, 1);

        io.emit('list-players', playersWithoutOpponent);
    });

    socket.on('play-with', (jogador2, jogador1) => {
        // make a room to two players and remove them from the list playersWithoutOpponent
        let index = playersWithoutOpponent.indexOf(jogador2);
        playersWithoutOpponent.splice(index, 1);
        console.log('INDEX IN PLAY-WITH -> '+index);

        index = playersWithoutOpponent.indexOf(jogador1);
        playersWithoutOpponent.splice(index, 1);
        console.log('INDEX IN PLAY-WITH -> '+index);

        // add them in list play now
        playersPlayingNow.push(jogador1);
        playersPlayingNow.push(jogador2);

        console.log(`${jogador2} will to play with ${jogador1}`);
        console.log(playersWithoutOpponent);

        // make link in room's creator
        let room = rooms.find(room => room.jogador1 == jogador1);
        console.log("jogador1: " + jogador1);
        console.log("jogador2: " + jogador2);
        console.log('------------- room game -------------');
        room.jogador2 = jogador2;
        room.link = `/${jogador1}-${jogador2}`;
        console.log(room);
        console.log('-------------------------------------');

        // delete room from other player
        let roomUpdate = rooms.filter(room => room.jogador1 != jogador2);
        rooms = roomUpdate;
        console.log(rooms);
        
        console.log('------------- all rooms -------------');
        console.log(JSON.stringify(rooms));
        console.log(playersWithoutOpponent);
        console.log('-------------------------------------');

        // access the link room
        makeLinkRoom(room.link, jogador1, jogador2);

        // show updated list
        console.log('-------- emit event --------');
        console.log(playersWithoutOpponent);
        io.emit('list-players', playersWithoutOpponent);

        // send the link to both players
        io.to(socketConnected[jogador1]).emit('access-link-room', room.link);
        io.to(socketConnected[jogador2]).emit('access-link-room', room.link);
    });

    socket.on('unload', (my_nickname, willPlayNow) => {
        if (willPlayNow) {
            // delete him from the list without opponent
            // let index = playersWithoutOpponent.indexOf(my_nickname);
            // playersWithoutOpponent.splice(index, 1);
            console.log('unload main page by '+my_nickname);
            console.log(playersWithoutOpponent);

            // add him in list playing now
            playersPlayingNow.push(my_nickname);

            for (const key in room_ply1_ply2) {
                if (key.includes(my_nickname)) {
                    // delete this
                    delete room_ply1_ply2[key];
                }
            }
        } else {
            console.log(`${my_nickname} saiu da sala`);

            // delete your room
            let room = rooms.find(r => r.jogador1 === my_nickname);
            let index = rooms.indexOf(room);
            rooms.splice(index, 1);

            // delete his from the list without opponent
            index = playersWithoutOpponent.indexOf(my_nickname);
            playersWithoutOpponent.splice(index, 1);
        }

        io.emit('list-players', playersWithoutOpponent);
    });

    socket.on('can i stay here', (link, cookie) => {
        console.log('checking permission... ');
        let name = cookie.split('=')[1];
        if (link.includes(name)) {
            socket.emit('can i stay here', true);
            // playersWithoutOpponent.push(name);
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
        console.log(' ------ list without opponent before ------');
        console.log(playersWithoutOpponent);

        // join jogador2 in room
        socket.join(nameRoom);
        console.log('Sockets in room ' + nameRoom + ':', io.sockets.adapter.rooms.get(nameRoom));
        console.log(player2 + ' in room');

        console.log('nameRoom: ' + nameRoom);
        console.log('jogador1:' + player1);
        console.log('jogador2:' + player2);
        console.log('idJogador1:' + socketConnected[player1]);
        console.log('idJogador2:' + socketConnected[player2]);
        console.log(' ------ list without opponent after ------');
        console.log(playersWithoutOpponent);

        let key = `${player1}-${player2}`;
        room_ply1_ply2[key] = { table: ['', '', '', '', '', '', '', '', ''] };

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

    socket.on('play again', (player1, player2, namePlayerCookie) => {
        let key = `${player1}-${player2}`;
        if (!room_ply1_ply2[key].playAgain) room_ply1_ply2[key].playAgain = 1;
        else room_ply1_ply2[key].playAgain++;

        console.log('room_ply1_ply2[key].playAgain: ' + room_ply1_ply2[key].playAgain)

        let receivedId;

        if (socket.id == socketConnected[player1]) receivedId = socketConnected[player2];
        else receivedId = socketConnected[player1];

        if (room_ply1_ply2[key].playAgain == 1) {
            socket.to(receivedId).emit('receive invite', 'receive invite');
            socket.emit('load gif', 'load gif');
        } else {
            console.log('the players want to continue play!!!');

            resetDatasInServer(key);

            socket.to(receivedId).emit('reset game', '');
            socket.emit('reset game', '');
        }
    });

    socket.on('unload match', (player1, player2, namePlayerCookie) => {
        delete socketConnected[namePlayerCookie];

        let receivedId;

        if (socket.id == socketConnected[player1]) receivedId = socketConnected[player2];
        else receivedId = socketConnected[player1];

        delete socketConnected[namePlayerCookie];

        socket.to(receivedId).emit('player leave match', namePlayerCookie);
    });

});

function resetDatasInServer(key) {
    // reset datas of the match these players
    delete room_ply1_ply2[key].playAgain;
    room_ply1_ply2[key] = { table: ['', '', '', '', '', '', '', '', ''] };
}

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
        return ['Nickname cannot be empty!', false];
    } else {
        let ret = '';
        for (const name of playersWithoutOpponent) {
            if (myNickname.toLowerCase() == name.toLowerCase()) {
                // already exists
                ret = 'This nickname already exists!';
            }
        }

        if (ret) {
            return [ret, false];
        } else {
            // accepted
            return ["Accepted nickname!", true];
        }
    }
}

server.listen(3000, () => {
    console.log('listening on http://localhost:3000');
});