const fs = require('node:fs');
const path = require('node:path');
const configHorario = require('./configHorario.json');
const { token } = require('./config.json');

const { Client, GatewayIntentBits, Collection } = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.commands = new Collection();

const foldersPath = path.join(__dirname, 'commands'); //__dirname é o caminho até a pasta onde está o arquivo que está rodando.

const commandFolder = fs.readdirSync(foldersPath); //lê todos os arquivos e subpastas dentro da pasta 'commands' de forma sincronizada.

for (const folder of commandFolder) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[ATENÇÃO] O comando em ${filePath} está falatndo uma propriedade de "data" ou "execute".`);
        }
    }
}

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

// Importa o módulo jobs (que exporta uma função async)
const jobs = require('./jobs');

// Importa o módulo soma dos pacotes
const SomaDosPacotes = require('./somadospacotes');

// Espera o client estar pronto para agendar as tarefas
client.once('ready', async () => {
    console.log(`Logado como ${client.user.tag}`);

    // Para cada título na configuração, agenda as tarefas
    for (const titulo in configHorario) {
        const config = configHorario[titulo];
        const TituloFormatado = titulo.toUpperCase().replace(/_/g, ' ');
        await jobs(client, config, TituloFormatado);  // Aguarda para garantir ordem, se quiser
    }

    // Executa a função soma dos pacotes
    SomaDosPacotes(client, configHorario);
});

client.login(token);
