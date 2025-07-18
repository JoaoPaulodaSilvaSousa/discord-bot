const { Events } = require('discord.js');
const { execute } = require('../commands/utility/ping');

module.exports = {
    name: Event.ClientReady,
    once: true,
    execute(client) {
        console.log(`Ready! Logged in as ${readyClient.user.tag}`);
    },
};