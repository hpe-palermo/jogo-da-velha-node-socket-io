const express = require('express');
const http = require('http');
const { join } = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let salasDoJogo = [];
let idSequence = 0;
let namespaceSala;
let nome_socket = {};
let url_idRoom = {};

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
                salaGame: salaGame
            };
            console.log("numJogadores: " + salaGame.numJogadores)

            if (salaGame.numJogadores == 1) {
                console.log('Criador entrou!!!');
            } else if (salaGame.numJogadores == 2) {
                console.log('Adversario entrou!!!');
            } else {
                console.log('A sala já está cheia!!!');
            }

            res.render('partida', dados);
        } else {
            // Se a sala não foi encontrada, você pode lidar com isso de acordo com sua lógica
            res.status(404).send('Sala não encontrada');
        }
    });
}

io.on('connection', (socket) => {
    console.log(`Cliente conectado: ${socket.id}`);

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

        // nova namespace de sala
        // namespaceSala = io.of(sala.link);
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
    socket.on('preeencher-2-player', (idSala, nomeJogador) => {
        let salaGame;
        salasDoJogo.forEach((sala) => {
            if (sala.id == idSala) {
                salaGame = sala;
            }
        })
        salaGame.jogador2 = nomeJogador;
        socket.emit('preeencher-2-player', salaGame.jogador2);
    });

});

server.listen(3000, () => {
    console.log(`Servidor ouvindo na porta http://localhost:3000`);
});
