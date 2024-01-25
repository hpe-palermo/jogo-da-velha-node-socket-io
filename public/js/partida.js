// settings of connect the players in match ============================================

// connect to the server
let namePlayerCookie;
let player1, player2;
let symbolPlayer = {};
const socket = io();

socket.emit('can i stay here', window.location.href, document.cookie);
socket.on('can i stay here', (answer) => {
    if (!answer) {
        document.cookie = '';
        window.location.href = '/';
    } else {
        namePlayerCookie = document.cookie.split('=')[1];
        player1 = document.getElementById('player1');
        player2 = document.getElementById('player2');
        let nameRoom = `room-${player1.value}-${player2.value}`;

        if (document.cookie.split('=')[1] == player1.value) {
            socket.emit('creator-in-room', nameRoom, document.cookie.split('=')[1], player2.value);
        }
    }
});

socket.on('invite player2', (nameRoom) => {
    if (document.cookie.split('=')[1] == player2.value) {
        socket.emit('player2-in-room', nameRoom, player1.value, player2.value);
    }
});

socket.on('joined-in-room', (msg) => {
    symbolPlayer[namePlayerCookie] = namePlayerCookie == player1.value ? 'X' : 'O';
    alert('I\'m ' + symbolPlayer[namePlayerCookie]);
});

let myIdSocket;
socket.emit('getMyId', '');
socket.on('getMyId', (id) => {
    myIdSocket = id;
});

// starting the match ============================================

// setting the game
let whoPlayNow = 'X';
let listButtons = document.querySelectorAll('[id^="btn-cell"]');
console.log(listButtons);
let tableGame = [];
let numCellClicked = 0;

listButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
        console.log(btn.id);
        socket.emit('whoPlayNow', Number(btn.id.substring(btn.id.length - 1, btn.id.length)), player1.value, player2.value, symbolPlayer[namePlayerCookie], whoPlayNow, numCellClicked);
    });
});

socket.on('whoPlayNow', (this_clickWhere, this_whoPlayNow, table, won, this_numCellClicked) => {
    if (table != null) {
        numCellClicked = this_numCellClicked;
        whoPlayNow = this_whoPlayNow;
        tableGame = table
        console.log('received tableGame');
        console.log(tableGame[0] + " | " + tableGame[1] + " | " + tableGame[2]);
        console.log('-------');
        console.log(tableGame[3] + " | " + tableGame[4] + " | " + tableGame[5]);
        console.log('-------');
        console.log(tableGame[6] + " | " + tableGame[7] + " | " + tableGame[8]);
        updateButton(this_clickWhere, tableGame);
    }

    if (won != undefined && won[1]) {
        if (whoPlayNow == 'O') {
            if (player1.value == namePlayerCookie) {
                alert('You win!!!');
            } else {
                alert('You lose!!!');
            }
        } else if (player2.value == namePlayerCookie) {
            if (player2.value == namePlayerCookie) {
                alert('You win!!!');
            } else {
                alert('You lose!!!');
            }
        }
    } else if (numCellClicked == 9) {
        socket.emit('draw', player1, player2, namePlayerCookie);
    }

    document.querySelector('#whoPlayNow').textContent = whoPlayNow;
});

socket.on('draw', (msg) => {
    alert(msg);
});

function updateButton(clickWhere, tableGame) {
    let img = document.getElementById(`img-cell-${clickWhere}`);

    console.log('upd btn');
    console.log(tableGame);
    console.log(clickWhere - 1);
    console.log(tableGame[clickWhere - 1])

    if (tableGame[clickWhere - 1] == 'X') {
        img.src = '/img/symbol_X.png'
    } else if (tableGame[clickWhere - 1] == 'O') {
        img.src = '/img/symbol_O.png'
    }
    img.style.visibility = 'visible';

    document.getElementById(`btn-cell-${clickWhere}`).disabled = true;
}


function startGame() {
    document.querySelector('#whoPlayNow').textContent = whoPlayNow;

    document.querySelector('#reload').addEventListener('click', () => {
        // location.reload()
        alert("reiniciar");
    })
}

startGame();

// when the user go out of the room
// window.addEventListener('beforeunload', () => {
//     socket.emit('unload match', namePlayerCookie);
// });