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
let listButtons = document.querySelectorAll('#btn-cell');
let tableGame = [];

listButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
        socket.emit('whoPlayNow', Number(btn.innerText), player1.value, player2.value, symbolPlayer[namePlayerCookie], whoPlayNow);
    });
});

socket.on('whoPlayNow', (this_whoPlayNow, table, won) => {

    if (table != null) {
        whoPlayNow = this_whoPlayNow;
        tableGame = table
        console.log('received tableGame');
        console.log(tableGame);
        updateButton();
    }

    if (won != undefined && won[1]) {
        if (whoPlayNow == 'O') {
            if (player1.value == namePlayerCookie) {
                alert('You win!!!');
            } else {
                alert('You lose!!!');
            }
        } else {
            if (player2.value == namePlayerCookie) {
                alert('You win!!!');
            } else {
                alert('You lose!!!');
            }
        }
    }

})

function updateButton() {
    listButtons.forEach((btn, index) => {
        if (tableGame[index])
            btn.innerText = tableGame[index];
    });
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