const { SlashCommandBuilder } = require('discord.js');

module.exports = {
	data: new SlashCommandBuilder() //A propriedade data dentro do module.exports guarda as informações que definem o comando || Um objeto é uma estrutura que guarda dados relacionados entre si — como uma caixa com etiquetas. || Uma propriedade é uma característica do objeto, ou seja, um dos itens armazenados dentro dele.
		.setName('user')
		.setDescription('Provides information about the user.'),
	async execute(interaction) { //É uma palavra-chave que indica que a função pode conter operações assíncronas, como por exemplo: || Esperar a resposta da API do Discord || Ler um arquivo || Consultar um banco de dados || Isso permite o uso do await dentro da função, para esperar algo acontecer sem travar o resto do código. || interaction é o parâmetro que representa a interação do usuário com o bot (por exemplo, um comando slash que ele executou).


		// interaction.user is the object representing the User who ran the command
		// interaction.member is the GuildMember object, which represents the user in the specific guild
		await interaction.reply(`This command was run by ${interaction.user.username}, who joined on ${interaction.member.joinedAt}.`);
	},
};