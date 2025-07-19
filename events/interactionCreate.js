const { Events } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) { //Função assíncrona chamada sempre que uma interação (comando, botão etc.) é criada. || Recebe o objeto interaction que contém dados da interação.
        if (!interaction.isChatInputCommand()) return;

        const command = interaction.client.commands.get(interaction.commandName); //Busca o comando que corresponde ao nome da interação no client.commands (onde seus comandos são armazenados).



        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            // código que pode dar erro
            await command.execute(interaction);
        } catch (error) {
            // o que fazer se der erro
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
            } else {
                await interaction.reply({ content: 'There was error while executing  this command!', ephemeral: true });
            }
        }
    },
};