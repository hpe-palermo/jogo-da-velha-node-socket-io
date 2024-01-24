// settings of match ============================================

// connect to the server
let namePlayerCookie;
let player1, player2;
let symbolPlayer = {};
const socket = io();

socket.emit('can i stay here', window.location.href, document.cookie);
socket.on('can i stay here', (answer) => {
    alert("Can i connect? " + answer);
    if (!answer) {
        document.cookie = '';
        window.location.href = '/';
    } else {
        namePlayerCookie = document.cookie.split('=')[1];
        player1 = document.getElementById('player1');
        player2 = document.getElementById('player2');
        let nameRoom = `room-${player1.value}-${player2.value}`;
        alert("i was accepted!!!");

        if (document.cookie.split('=')[1] == player1.value) {
            alert('join creator in room');
            socket.emit('creator-in-room', nameRoom, document.cookie.split('=')[1], player2.value);
        } else {
            alert('invited');
        }
    }
});

socket.on('invite player2', (nameRoom) => {
    if (document.cookie.split('=')[1] == player2.value) {
        alert("player2-in-room");
        socket.emit('player2-in-room', nameRoom, player1.value, player2.value);
    }
});

socket.on('joined-in-room', (msg) => {
    alert('joined-in-room', msg);
    symbolPlayer[namePlayerCookie] = namePlayerCookie == player1.value ? 'X' : 'O';
    alert('I\'m ' + symbolPlayer[namePlayerCookie]);
});

// testing send msg ===========================
// socket.on('message', (msg) => {
//     alert("Msg: " + msg);
// });
// ============================================

let myIdSocket;
socket.emit('getMyId', '');
socket.on('getMyId', (id) => {
    myIdSocket = id;
    alert('My id: ' + myIdSocket);
});

// starting the match ============================================
let canvas = document.querySelector('canvas')
let ctx = canvas.getContext('2d');
let sideOfSquare = canvas.width
canvas.height = canvas.width
let whoPlayNow = 'X';
let imgSymbol = new Image()
imgSymbol.src = whoPlayNow == "X" ? "img/symbol_X.png" : "img/symbol_O.png"
let table = [
    '', '', '', '', '', '', '', '', '',
]
let cor = 'black'

function drawLine(cor, x0, y0, x, y) {
    ctx.lineWidth = 5;
    ctx.strokeStyle = cor;

    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x, y);
    ctx.stroke();
}

function createTheDividingLines() {

    // Desenhe uma linha
    drawLine(cor, sideOfSquare / 3, 0, sideOfSquare / 3, sideOfSquare);
    drawLine(cor, sideOfSquare * 2 / 3, 0, sideOfSquare * 2 / 3, sideOfSquare);
    drawLine(cor, 0, sideOfSquare / 3, sideOfSquare, sideOfSquare / 3);
    drawLine(cor, 0, sideOfSquare * 2 / 3, sideOfSquare, sideOfSquare * 2 / 3);

}

function decideQuemComeca() {
    return Math.floor(Math.random() * 2) == 1 ? "X" : "O";
}

function checkWhereWasClicked(mouseX, mouseY) {
    if (mouseX <= sideOfSquare / 3) {
        if (mouseY <= sideOfSquare / 3) {
            return 1
        } else if (mouseY <= sideOfSquare * 2 / 3) {
            return 4
        } else {
            return 7
        }
    } else if (mouseX <= sideOfSquare * 2 / 3) {
        if (mouseY <= sideOfSquare / 3) {
            return 2
        } else if (mouseY <= sideOfSquare * 2 / 3) {
            return 5
        } else {
            return 8
        }
    } else {
        if (mouseY <= sideOfSquare / 3) {
            return 3
        } else if (mouseY <= sideOfSquare * 2 / 3) {
            return 6
        } else {
            return 9
        }
    }
}

function tryFillHouse() {
    if (table[clickedHouse - 1]) {
        alert("This house already filled!")
    } else {
        alert('draw symbol');
        drawSymbol(clickedHouse);
        alert('alternate turn');
        let whoPlayed = namePlayerCookie;
        socket.emit('whoPlayNow', whoPlayNow, whoPlayed, clickedHouse, player1.value, player2.value);
    }
}

socket.on('whoPlayNow', (this_whoPlayNow, this_clickedHouse) => {
    whoPlayNow = this_whoPlayNow;
    drawSymbol(this_clickedHouse);
    imgSymbol.src = whoPlayNow == "X" ? "img/symbol_X.png" : "img/symbol_O.png";
    table[clickedHouse - 1] = whoPlayNow;
    alert("Now, whoPlayNow is " + whoPlayNow);
    document.querySelector('#whoPlayNow').textContent = whoPlayNow;
});

function checkVitory(numFillHouse) {

    let line = horizontal()
    let column = vertical()
    let main_diagonal = mainDiagonal()
    let secondary_diagonal = secondaryDiagonal()

    console.log(line)
    console.log(column)
    console.log(main_diagonal)
    console.log(secondary_diagonal)

    if (line[0]) {
        let winner = line[2] == "X" ? "O" : "X"
        drawVictory(line, "linha")
    } else if (column[0]) {
        let winner = column[2] == "X" ? "O" : "X"
        drawVictory(column, "coluna")
    } else if (main_diagonal[0]) {
        let winner = main_diagonal[1] == "X" ? "O" : "X"
        drawVictory(main_diagonal, "diagonalP")
    } else if (secondary_diagonal[0]) {
        let winner = secondary_diagonal[1] == "X" ? "O" : "X"
        drawVictory(secondary_diagonal, "diagonalS")
    } else if (numFillHouse == 9) {
        document.querySelector('#whoPlayNow').textContent = "Deu velha"
        canvas.removeEventListener('click', clickInCanvas)
    }
}

function horizontal() {
    let venceu = false
    let indice = 0
    let simbolo = ""
    for (let i = 0; i < 9; i += 3) {
        let a = (table[i] == table[i + 1] && table[i + 1] == table[i + 2])
        let b = (table[i] + table[i + 1] + table[i + 2]).length == 3
        let c = a && b
        if (c) {
            venceu = true
            simbolo = table[i]
            break
        }
        indice++
    }
    return [venceu, indice, simbolo]
}

function vertical() {
    let win = false
    let index = 0
    let symbol = ""
    for (let i = 0; i < 3; i++) {
        let a = (table[i] == table[i + 3] && table[i + 3] == table[i + 6])
        let b = (table[i] + table[i + 3] + table[i + 6]).length == 3
        let c = a && b
        if (c) {
            win = true
            symbol = table[i]
            break
        }
        index++
    }
    return [win, index, symbol]
}

function mainDiagonal() {
    return [
        (
            table[0] == table[4] && table[4] == table[8] &&
            (table[0] + table[4] + table[8]).length == 3
        ), table[0]
    ]
}

function secondaryDiagonal() {
    return [
        (
            table[2] == table[4] && table[4] == table[6] &&
            (table[2] + table[4] + table[6]).length == 3
        ), table[2]
    ]
}

function drawVictory(list, whereWon) {
    if (list.length == 3) {
        if (whereWon == "linha") {
            // linha
            if (list[1] == 0) {
                drawLine('#FF0000', sideOfSquare / 10, sideOfSquare / 6, sideOfSquare * 9 / 10, sideOfSquare / 6);
            } else if (list[1] == 1) {
                drawLine('#FF0000', sideOfSquare / 10, sideOfSquare / 2, sideOfSquare * 9 / 10, sideOfSquare / 2);
            } else {
                drawLine('#FF0000', sideOfSquare / 10, sideOfSquare * 5 / 6, sideOfSquare * 9 / 10, sideOfSquare * 5 / 6);
            }
        } else {
            // coluna
            if (list[1] == 0) {
                drawLine('#FF0000', sideOfSquare / 6, sideOfSquare / 10, sideOfSquare / 6, sideOfSquare * 9 / 10);
            } else if (list[1] == 1) {
                drawLine('#FF0000', sideOfSquare / 2, sideOfSquare / 10, sideOfSquare / 2, sideOfSquare * 9 / 10);
            } else {
                drawLine('#FF0000', sideOfSquare * 5 / 6, sideOfSquare / 10, sideOfSquare * 5 / 6, sideOfSquare * 9 / 10);
            }
        }
    } else {
        if (whereWon == "diagonalP") {
            drawLine('#FF0000', sideOfSquare / 10, sideOfSquare / 10, sideOfSquare * 9 / 10, sideOfSquare * 9 / 10);
        } else {
            drawLine('#FF0000', sideOfSquare * 9 / 10, sideOfSquare / 10, sideOfSquare / 10, sideOfSquare * 9 / 10);
        }
    }
    canvas.removeEventListener('click', clickInCanvas)
    socket.emit('change turn and show', whoPlayNow, player1, player2);
}

socket.on('change turn and show', (this_whoPlayNow) => {
    whoPlayNow = this_whoPlayNow;
    document.querySelector('#whoPlayNow').textContent = "Player " + whoPlayNow + " won!!!"
});

function clickInCanvas(event) {
    alert(`
    symbolPlayer[namePlayerCookie]: ${symbolPlayer[namePlayerCookie]}
    whoPlayNow: ${whoPlayNow}
    `);
    if (symbolPlayer[namePlayerCookie] == whoPlayNow) {
        var mouseX = event.clientX - canvas.getBoundingClientRect().left;
        var mouseY = event.clientY - canvas.getBoundingClientRect().top;

        console.log('Posição do clique:', mouseX, mouseY);

        clickedHouse = checkWhereWasClicked(mouseX, mouseY);

        tryFillHouse()

        let numFillHouse = 0
        let tableToPrint = ""
        for (let i = 1; i <= table.length; i++) {
            if (table[i] != "") {
                numFillHouse++
            }
            tableToPrint += table[i - 1] + " ";
            if (i % 3 == 0) {
                tableToPrint += "\n"
            }
        }

        console.log(tableToPrint)
        console.log("numFillHouse: " + numFillHouse)

        checkVitory(numFillHouse)
    } else {
        alert("Isn't your turn's!");
    }
}

let fillHouse = {
    1: function (imgX, imgY, scale) {
        imgX = (sideOfSquare / 6) - (imgSymbol.width / 4)
        imgY = sideOfSquare / 6 - imgSymbol.height / 4
        ctx.drawImage(
            imgSymbol,
            0, 0, imgSymbol.width, imgSymbol.height,
            imgX, imgY, imgSymbol.width / scale, imgSymbol.height / scale
        )
    },
    2: function (imgX, imgY, scale) {
        imgX = (sideOfSquare / 2) - (imgSymbol.width / 4)
        imgY = sideOfSquare / 6 - imgSymbol.height / 4
        ctx.drawImage(
            imgSymbol,
            0, 0, imgSymbol.width, imgSymbol.height,
            imgX, imgY, imgSymbol.width / scale, imgSymbol.height / scale
        )
    },
    3: function (imgX, imgY, scale) {
        imgX = (sideOfSquare * 5 / 6) - (imgSymbol.width / 4)
        imgY = sideOfSquare / 6 - imgSymbol.height / 4
        ctx.drawImage(
            imgSymbol,
            0, 0, imgSymbol.width, imgSymbol.height,
            imgX, imgY, imgSymbol.width / scale, imgSymbol.height / scale
        )
    },
    4: function (imgX, imgY, scale) {
        imgX = (sideOfSquare / 6) - (imgSymbol.width / 4)
        imgY = sideOfSquare / 6 - imgSymbol.height / 4 + sideOfSquare / 3
        ctx.drawImage(
            imgSymbol,
            0, 0, imgSymbol.width, imgSymbol.height,
            imgX, imgY, imgSymbol.width / scale, imgSymbol.height / scale
        )
    },
    5: function (imgX, imgY, scale) {
        imgX = (sideOfSquare / 2) - (imgSymbol.width / 4)
        imgY = sideOfSquare / 6 - imgSymbol.height / 4 + sideOfSquare / 3
        ctx.drawImage(
            imgSymbol,
            0, 0, imgSymbol.width, imgSymbol.height,
            imgX, imgY, imgSymbol.width / scale, imgSymbol.height / scale
        )
    },
    6: function (imgX, imgY, scale) {
        imgX = (sideOfSquare * 5 / 6) - (imgSymbol.width / 4)
        imgY = sideOfSquare / 6 - imgSymbol.height / 4 + sideOfSquare / 3
        ctx.drawImage(
            imgSymbol,
            0, 0, imgSymbol.width, imgSymbol.height,
            imgX, imgY, imgSymbol.width / scale, imgSymbol.height / scale
        )
    },
    7: function (imgX, imgY, scale) {
        imgX = (sideOfSquare / 6) - (imgSymbol.width / 4)
        imgY = sideOfSquare / 6 - imgSymbol.height / 4 + sideOfSquare / 1.5
        ctx.drawImage(
            imgSymbol,
            0, 0, imgSymbol.width, imgSymbol.height,
            imgX, imgY, imgSymbol.width / scale, imgSymbol.height / scale
        )
    },
    8: function (imgX, imgY, scale) {
        imgX = (sideOfSquare / 2) - (imgSymbol.width / 4)
        imgY = sideOfSquare / 6 - imgSymbol.height / 4 + sideOfSquare / 1.5
        ctx.drawImage(
            imgSymbol,
            0, 0, imgSymbol.width, imgSymbol.height,
            imgX, imgY, imgSymbol.width / scale, imgSymbol.height / scale
        )
    },
    9: function (imgX, imgY, scale) {
        imgX = (sideOfSquare * 5 / 6) - (imgSymbol.width / 4)
        imgY = sideOfSquare / 6 - imgSymbol.height / 4 + sideOfSquare / 1.5
        ctx.drawImage(
            imgSymbol,
            0, 0, imgSymbol.width, imgSymbol.height,
            imgX, imgY, imgSymbol.width / scale, imgSymbol.height / scale
        )
    },
}

function drawSymbol(clickedHouse) {
    let scale = 2
    let imgX, imgY
    fillHouse[clickedHouse](imgX, imgY, scale);
}

function startGame() {

    createTheDividingLines()

    // who start
    document.querySelector('#whoPlayNow').textContent = whoPlayNow

    // identificar onde clicou no canvas
    canvas.addEventListener('click', clickInCanvas)

    // reiniciar game
    document.querySelector('button').addEventListener('click', () => {
        location.reload()
    })
}

startGame()