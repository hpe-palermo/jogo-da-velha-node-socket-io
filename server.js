const express = require('express');
const http = require('http');
const { join } = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let salasDoJogo = [];
let idSequence = 0;
let nome_socket = {};
let url_idRoom = {};
let salaGlobal = {};

let links_funcoes = {
    '/': (req, res) => {
        res.render('index');
    },
    '/salas': (req, res) => {
        res.render('salas');
    }
}

app.set('view engine', 'ejs');
app.set('views', join(__dirname, 'views'));
app.use(express.static(join(__dirname, 'public')));

function gerarLinksAplicacao() {
    for (let link in links_funcoes) {
        app.get(link, (req, res) => {
            links_funcoes[link](req, res);
        });
    }
}
gerarLinksAplicacao();

function criarNovaSala(link) {
    app.get(link, (req, res) => {
        let existe = false;
        let salaGame;

        let [id, nome, criador] = link.split('-');
        let indBarra = id.indexOf('/');
        indBarra = id.indexOf('/', indBarra + 1);
        id = id.substring(indBarra + 1, id.length);

        salasDoJogo.forEach((sala) => {
            if (sala.id == id) {
                salaGame = sala;
            }
            console.log("Id desejado: " + id);
            console.log("Id for: " + sala.id);
        });

        console.log("SalaGame após a procura: " + salaGame);

        // Verifica se a sala foi encontrada antes de acessar suas propriedades
        if (salaGame) {
            console.log('------------ SALA DO GAME ---------');
            console.log(salaGame);
            console.log('-----------------------------------');
            salaGame.jogador1 = salaGame.criador;
            salaGame.numJogadores++;
            let dados = {
                salaGame: salaGlobal
            };
            console.log('----------------------- dados --------------------------');
            console.log();
            console.log(dados);
            console.log();
            console.log('--------------------------------------------------------');
            console.log("numJogadores: " + salaGame.numJogadores)

            if (salaGame.numJogadores == 1) {
                salaGlobal.jogador1 = salaGame.criador;
                console.log('Criador entrou!!!');
                res.render('partida', dados);
            } else if (salaGame.numJogadores == 2) {
                // salaGame.jogador2 = nomeJogador
                console.log('Adversario entrou!!!');
                res.render('partida', dados);
            } else {
                console.log('A sala já está cheia!!!');
            }

            // res.render('partida', dados);
        } else {
            // Se a sala não foi encontrada, você pode lidar com isso de acordo com sua lógica
            res.status(404).send('Sala não encontrada');
        }
    });
}

io.on('connection', (socket) => {
    console.log(`Cliente conectado: ${socket.id}`);

    socket.on('disconnect', () => {
        console.log(`Cliente desconectado: ${socket.id}`);
    });

    socket.on('getMyIdSocket', (nomePlayer) => {
        nome_socket[nomePlayer] = socket.id;
        console.log('--------------------------------');
        console.log(nome_socket);
        console.log('--------------------------------');
        socket.emit('getMyId', socket.id);
    });

    // pagina index.ejs =========================================
    socket.on('novo-jogador', (namePlayer) => {
        socket.emit('jogador-adicionado', '');
    });

    socket.on('cookie-salvo', (_) => {
        socket.emit('redirect', '/salas');
    });

    // pagina salas.ejs =========================================
    io.emit('listar-salas', salasDoJogo);

    socket.on('nova-sala', (sala) => {
        sala.id = idSequence;
        sala.link = `/salas/${sala.id}-${sala.nome}-${sala.criador}`;
        sala.idJ1 = nome_socket[sala.criador];

        salaGlobal = sala;
        criarNovaSala(sala.link);
        salasDoJogo.push(sala);
        console.log(salasDoJogo);

        io.emit('listar-salas', salasDoJogo);
        idSequence++;

        url_idRoom[sala.link] = sala.id;

        console.log('--------- URL_ID_ROOM ----------');
        console.log(url_idRoom);
        console.log('--------------------------------');

        console.log('---------------- SALAS ------------');
        console.log(salasDoJogo);
        console.log('-----------------------------------');

        socket.emit('entrar-na-partida', sala.link);
    });

    socket.on('excluir-sala', (idSala) => {
        salasDoJogo.splice(idSala, 1);
        io.emit('listar-salas', salasDoJogo);
        io.emit('sala-excluida', '');
    });

    socket.on('entrar-na-sala', (idSala) => {
        console.log("Entrando na sala " + idSala)
        let sala = salasDoJogo.find(sala => sala.id === idSala);
        url_idRoom[sala.link] = idSala;
        socket.emit('entrar-na-partida', sala.link);
    });

    // pagina partida.ejs =======================================
    socket.on('preencher-2-player-aqui', (salaGame, nome) => {
        salaGlobal.jogador2 = nome;
        socket.emit('nome-2-player-recebido', nome);
    });

    socket.on('jogador2-entrou-na-sala', (novaSala) => {
        let senderID = socket.id; // Usando o próprio socket para obter o ID do remetente
        let receivedID = nome_socket[novaSala.jogador1];
        novaSala.idJogador1 = receivedID;

        console.log("----- jogador2-entrou-na-sala ------");
        console.log(novaSala);
        console.log("senderID: " + senderID);
        console.log("receivedID: " + receivedID);
        console.log("------------------------------------");

        // Certifique-se de que os IDs são diferentes antes de emitir os eventos
        if (senderID !== receivedID) {
            // Emitir para o jogador1
            socket.to(receivedID).emit('completa-dados-jogadores', novaSala);
            // Emitir para o jogador2 (o próprio remetente)
            socket.emit('completa-dados-jogadores', novaSala);
        }
    });

    socket.on('decide-quem-comeca', (novaSala) => {
        let senderID = nome_socket[novaSala.jogador1];
        let receivedID = nome_socket[novaSala.jogador2];
        let jogadorSimbolo = {};

        let vez = decideQuemComeca();
        // decide quem eh quem
        if (Math.floor(Math.random() * 2)) {
            jogadorSimbolo[novaSala.jogador1] = 'X';
            jogadorSimbolo[novaSala.jogador2] = 'O';
        } else {
            jogadorSimbolo[novaSala.jogador1] = 'O';
            jogadorSimbolo[novaSala.jogador2] = 'X';
        }

        if (senderID !== receivedID) {
            socket.to(receivedID).emit('quem-comeca-eh', vez, jogadorSimbolo);
            socket.emit('quem-comeca-eh', vez, jogadorSimbolo);
        }
    });

    socket.on('joguei-na-casa', (casaClicada, nomeJogadorNestaSala, novaSala) => {
        let msg = `${nomeJogadorNestaSala} jogou na casa ${casaClicada}!!!`;
        console.log(msg);

        let receivedID;
        if (novaSala.criador == nomeJogadorNestaSala) {
            receivedID = nome_socket[novaSala.jogador2];
        } else {
            receivedID = nome_socket[novaSala.jogador1];
        }

        console.log('enviando para '+receivedID);
        socket.to(receivedID).emit('adversario-jogou-na-casa', msg, casaClicada  );
    });

});

function decideQuemComeca() {
    return Math.floor(Math.random() * 2) == 1 ? "X" : "O";
}

server.listen(3000, () => {
    console.log(`Servidor ouvindo na porta http://localhost:3000`);
});
