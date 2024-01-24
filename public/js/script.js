let socket = io();

let myNickname = document.getElementById('myNickname');
let findPlayer = document.getElementById('findPlayer');
let listPlayers = document.querySelectorAll('h3');
let listAllplayers = document.querySelectorAll('#player');
let listElementsToRender = [];
let namesPlayer = [];
let namesPlayerToRender = [];
let stateNickname = document.getElementById('state-nickname');
let btnSend = document.getElementById('btnSend');
let myID_nickname = -1;
let my_nickname = '';

// input my nickname
btnSend.addEventListener('click', () => {
    // sends nickname to server to check if name is valid
    socket.emit('save-nickname', myNickname.value, myID_nickname);
});

// list players connected to server
socket.on('list-players', (playersConnected) => {
    namesPlayer = playersConnected;
    namesPlayerToRender = playersConnected;
    renderElements();
});

// message of error of nickname
socket.on('state-nickname', (msgError, accepted, myId) => {
    if (accepted) {
        myID_nickname = myId;
        my_nickname = myNickname.value;
        // alert('my id nickname: ' + myID_nickname);
    }
    stateNickname.innerText = msgError;
});

// fill the list of names
listPlayers.forEach((player) => {
    // players
    namesPlayer.push(player.innerText);
});

findPlayer.addEventListener('input', () => {
    // filter players
    // alert('-> '+namesPlayer);
    namesPlayer.forEach((player) => {
        // players
        if (player.toLowerCase().includes(findPlayer.value.toLowerCase())) {
            namesPlayerToRender.push(player);
        }
    });

    renderElements();
});

function renderElements() {
    // render the names player
    let listPlayers = document.querySelector('#listPlayers');
    listPlayers.innerHTML = '';

    let elementToRender = '';
    console.log('----------------------------------------------------------------');
    console.log(namesPlayerToRender);
    namesPlayerToRender.forEach((player, index) => {
        let nameCapitalized = player.charAt(0).toUpperCase() + player.slice(1);
        elementToRender +=
            `
        <div id="player" class="d-flex justify-content-between p-2 mt-2">
            <h3 class="m-2" id="namePlayer">${index} - ${nameCapitalized}</h3>
            <div>
        `;
        if (my_nickname.toLowerCase() == player) {
            myID_nickname = index;
            elementToRender +=
                `
            <button class="btn btn-danger m-1" onclick="deletePlayer()">Delete</button>
            `;
        } else {
            elementToRender +=
                `
                <button class="btn btn-success m-1">Play</button>
            `;
        }
        elementToRender +=
            `
            </div>
        </div>
        `;

        listPlayers.innerHTML = elementToRender;
        console.log(`Player[${index}]: ${player}`)
    });

    namesPlayerToRender = [];
}

function deletePlayer() {
    socket.emit('delete player', myID_nickname);
}
