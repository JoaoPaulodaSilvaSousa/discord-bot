const { corteHora, corteMinuto, postagemHora, postagemMinuto, canalid } = require('./configHorario.json');
const config = { corteHora,corteMinuto, postagemHora, postagemMinuto, canalid };



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

const jobs = require('./jobs');
jobs(client, config); //Executa essa função passando client e config como argumentos:

// Log in to Discord with your client's token
client.login(token);
