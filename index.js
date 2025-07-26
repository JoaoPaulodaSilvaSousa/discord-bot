// Importa o módulo 'fs' (File System) nativo do Node.js.
// Esse módulo permite ler, escrever, modificar e interagir com arquivos e pastas do sistema.
const fs = require('node:fs');

// Importa o módulo 'path' também nativo do Node.js.
// Ele é usado para manipular caminhos de arquivos e diretórios de forma segura e multiplataforma.
const path = require('node:path');

// Importa o arquivo de configuração de horários (JSON) que contém os horários agendados para cada logística.
// O caminho './configHorario.json' indica que o arquivo está na mesma pasta que este script.
const configHorario = require('./configHorario.json');

// Seleciona especificamente a configuração da logística chamada "PLACE" dentro do JSON importado.
// Ou seja, a partir de agora, 'config' conterá os valores como corteHora, corteMinuto, canalid, etc., somente da logística PLACE.
const config = configHorario.PLACE;

// Importa o token do bot a partir de outro arquivo JSON de configuração, geralmente onde estão credenciais sensíveis.
// Esse 'config.json' deve conter pelo menos uma chave chamada "token".
const { token } = require('./config.json');

// Require as classes necessárias do discord.js
const { Client, Events, GatewayIntentBits, Collection, InteractionCallback, MessageFlags } = require('discord.js');

// Cria uma nova instância do cliente do Discord
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

// Cria uma coleção para armazenar os comandos
client.commands = new Collection();

// Carrega os comandos
const foldersPath = path.join(__dirname, 'commands');
const commandFolder = fs.readdirSync(foldersPath);

for (const folder of commandFolder) {
    const commandsPath = path.join(foldersPath, folder);
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

// Carrega os eventos
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

// Carrega e executa o arquivo jobs.js, passando o client e a configuração
const jobs = require('./jobs');
jobs(client, config);

// Carrega e executa o arquivo SomaDosPacotes, passando o client e a configuração
const SomaDosPacotes = require('./somadospacotes');
SomaDosPacotes(client, configHorario);

// Loga no Discord com o token
client.login(token);
