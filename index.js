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

// Cria uma coleção (estrutura de dados semelhante a um Map) dentro do client para armazenar todos os comandos do bot.
// Isso permite que a gente recupere e execute comandos facilmente com: client.commands.get('nomeComando')
client.commands = new Collection();

// Define o caminho da pasta "commands" onde estão localizados os comandos do bot.
// __dirname é a pasta atual do arquivo que está sendo executado.
const foldersPath = path.join(__dirname, 'commands');

// Lê o conteúdo da pasta "commands" e armazena o nome de cada subpasta (cada uma representa uma categoria de comandos).
const commandFolder = fs.readdirSync(foldersPath);

// Percorre cada subpasta dentro de "commands"
for (const folder of commandFolder) {

     // Monta o caminho completo até a subpasta atual
    const commandsPath = path.join(foldersPath, folder);

     // Lê todos os arquivos da subpasta atual e filtra apenas os arquivos que terminam com ".js"
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    // Percorre todos os arquivos de comando encontrados
    for (const file of commandFiles) {
        // Monta o caminho completo do arquivo de comando
        const filePath = path.join(commandsPath, file);
        // Importa o comando usando require (espera-se que o arquivo exporte um objeto com as propriedades "data" e "execute")
        const command = require(filePath);
        // Verifica se o comando tem as propriedades obrigatórias: "data" (com informações como nome e descrição) e "execute" (a função que executa o comando)
        if ('data' in command && 'execute' in command) {
            // Adiciona o comando à coleção de comandos, usando o nome (command.data.name) como chave
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}

// Carrega os eventos
// Define o caminho até a pasta "events", onde ficam os arquivos que definem os eventos do bot.
const eventsPath = path.join(__dirname, 'events');
// Lê todos os arquivos da pasta "events" e filtra apenas os arquivos que terminam com ".js"
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

// Percorre todos os arquivos de eventos encontrados
for (const file of eventFiles) {
    // Monta o caminho completo do arquivo de evento
    const filePath = path.join(eventsPath, file);
    // Importa o arquivo de evento, que deve exportar um objeto com as propriedades "name", "execute" e (opcionalmente) "once"
    const event = require(filePath);

     // Se o evento deve ser executado apenas uma vez (por exemplo, "ready")
    if (event.once) {
        // Usa client.once() para registrar o evento, o que significa que ele será executado **somente uma vez**
        client.once(event.name, (...args) => event.execute(...args));
        // Caso contrário, usa client.on() para registrar o evento, que será executado **toda vez que o evento ocorrer**
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

// Carrega o módulo "jobs.js" localizado na raiz do projeto e o armazena na variável "jobs".
// Em seguida, executa a função exportada por esse arquivo, passando o "client" (instância do bot) e "config" como argumentos.
// Isso geralmente é usado para agendar tarefas automáticas (como cron jobs, notificações etc.).
const jobs = require('./jobs');
jobs(client, config);

// Carrega o módulo "somadospacotes.js" (também na raiz do projeto) e o armazena na variável "SomaDosPacotes".
// Executa a função exportada pelo módulo, passando o "client" (bot) e o "configHorario", que provavelmente contém horários agendados personalizados.
// Essa função é responsável por somar ou manipular dados relacionados a pacotes (como envios, entregas etc.).
const SomaDosPacotes = require('./somadospacotes');
SomaDosPacotes(client, configHorario);

// Loga no Discord com o token
client.login(token);
