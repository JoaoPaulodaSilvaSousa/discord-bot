const { corteHora, corteMinuto, postagemHora, postagemMinuto, canalid } = require('./configHorario.json');



const fs = require('node:fs');
const path = require('node:path');

// Require the necessary discord.js classes
const { Client, Events, GatewayIntentBits, Collection, InteractionCallback, MessageFlags } = require('discord.js'); //GatewayIntentBits: informa ao Discord quais eventos você quer receber (como interações de comandos). Collection: é tipo um Map especial do Discord.js, usado para armazenar os comandos.

const { token } = require('./config.json');

const cron = require('node-cron');

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] }); //Você está criando seu bot (client) com o "intenção" de usar apenas servidores (Guilds). Se quiser que o bot reaja a mensagens, reações, etc., precisaria adicionar mais intents.


client.commands = new Collection(); //Aqui você está criando uma lista especial para guardar todos os comandos que o bot pode usar.

// Carrega comandos
const foldersPath = path.join(__dirname, 'commands');
const commandFolder = fs.readdirSync(foldersPath);

for (const folder of commandFolder) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        // Set a new item in the Collection with the key as the command name and the value as the exported module
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" propety.`);
        }
    }
}

// Carrega eventos
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args)); //Escuta o evento somente uma única vez, depois para de ouvir.
    } else {
        client.on(event.name, (...args) => event.execute(...args)); //client.on: Escuta o evento toda vez que ele acontecer (quantas vezes for necessário). || Uma função anônima que repassa os argumentos do evento para execute. || Pega todos os parâmetros enviados pelo evento (ex: interaction, client, etc) 
    }
}

client.once('ready', () => {
    console.log(`Logado como ${client.user.tag}`);

    const cronHoraCorte = `${corteMinuto} ${corteHora} * * *`;
    const cronHoraPostagem = `${postagemMinuto} ${postagemHora} * * *`;

    //cron principal
    cron.schedule('* * * * 1-5', async () => {
        const canal = client.channels.cache.get(canalid);
        if (!canal) return console.log('Canal não encontrado!');

        // Mensagem de bom dia
        await canal.send('Bom dia! Está é a mensagem automática das 9h.')


        const horaCorte = `${String(corteHora).padStart(2, '0')}:${String(corteMinuto).padStart(2, '0')}`;
        const horaPostagem = `${String(postagemHora).padStart(2, '0')}:${String(postagemMinuto).padStart(2, '0')}`;

        await canal.send(`O horário de corte hoje é: ${horaCorte} e o horário de postagem é: ${horaPostagem}`);
    }, {
        timezone: "America/Sao_Paulo"
    });

    // Para horario de corte e postagem

    //corte
    cron.schedule(cronHoraCorte, async () => {
        const canal = client.channels.cache.get(canalid);
        if (!canal) return console.log('Canal não encontrado!');
        await canal.send('Atenção: Prepare o envio dos pacotes! Já deu o horário de corte.');

    }, {
        timezone: "America/Sao_Paulo"
    });

    //postagem
    cron.schedule(cronHoraPostagem, async () => {
        const canal = client.channels.cache.get(canalid);
        if (!canal) return console.log('Canal não encontrado!');
        await canal.send('O horário de postagem foi encerrado!');
    }, {
        timezone: "America/Sao_Paulo"
    })

});




// Log in to Discord with your client's token
client.login(token);
