const { Events } = require('discord.js'); //Esse é um jeito de extrair apenas uma parte específica (a propriedade chamada Events) do objeto que vem do require('discord.js').

module.exports = {
    name: Events.ClientReady,
    once: true,
    execute(client) {
        console.log(`Ready! Logged in as ${client.user.tag}`);
    },
};