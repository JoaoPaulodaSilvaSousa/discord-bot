const { REST, Routes } = require('discord.js');
const { clientId, guildId, token } = require('./config.json');
const fs = require('node:fs'); //acessa e manipula arquivos e pastas no seu computador.

const path = require('node:path'); //monta e manipula os caminhos para esses arquivos e pastas, de forma que funcione em qualquer sistema.

const commands = [];
// Grab all the command folders from the commands directory you created earlier
const foldersPath = path.join(__dirname, 'commands');//__dirname é uma variável especial no Node.js.Ela representa o caminho absoluto da pasta onde o arquivo JavaScript atual está localizado.

const commandFolders = fs.readdirSync(foldersPath); //fs.readdirSync retorna uma lista (array) com os nomes das subpastas (ou arquivos) dentro dessa pasta commands.

for (const folder of commandFolders) {
	// Pega o caminho da subpasta de comandos

	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file); // caminho completo do arquivo
		const command = require(filePath); // importa o módulo JS do comando
		if ('data' in command && 'execute' in command) { // Verifica se o comando tem as propriedades obrigatórias 'data' e 'execute'
			commands.push(command.data.toJSON()); // Transforma o comando para JSON e adiciona na lista commands para deploy || O método .toJSON() transforma esse objeto em um objeto puro JavaScript (um JSON válido) que pode ser convertido em texto JSON para envio na requisição HTTP. Isso garante que o objeto seja formatado exatamente como a API espera, com as propriedades corretas, tipos e estrutura.


		} else { // Caso o comando esteja mal formatado, exibe um aviso no console
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(token); //REST é como um "mensageiro" que você usa para mandar informações para o Discord.

// and deploy your commands!
(async () => { //sso é uma função Immediately Invoked Function Expression (IIFE). O objetivo é rodar uma função assíncrona logo que o script for executado, sem precisar chamá-la depois.
	try {
		console.log(`Started refreshing ${commands.length} application (/) commands.`);

		// The put method is used to fully refresh all commands in the guild with the current set
		const data = await rest.put(
			Routes.applicationGuildCommands(clientId, guildId),
			{ body: commands }, //{ body: commands }: corpo da requisição. É a lista de comandos transformada em JSON (command.data.toJSON())
		);

		console.log(`Successfully reloaded ${data.length} application (/) commands.`); //data.length mostra quantos comandos foram enviados com sucesso.
	} catch (error) {
		// And of course, make sure you catch and log any errors!
		console.error(error);
	}
})();