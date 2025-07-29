const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('limpar')
        .setDescription('🧹 Apaga todas as mensagens do canal atual.')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages), // Só quem tem permissão pode usar

    async execute(interaction) {
        const channel = interaction.channel;

        // Verifica se é um canal de texto
        if (!channel || !channel.isTextBased()) {
            return interaction.reply({ content: '❌ Este comando só pode ser usado em canais de texto.', ephemeral: true });
        }

        await interaction.reply({ content: '🧹 Iniciando limpeza de mensagens no canal...', ephemeral: true });

        let apagadas = 0;

        try {
            let fetched;

            do {
                fetched = await channel.messages.fetch({ limit: 100 });

                if (fetched.size === 0) break;

                // Separa mensagens com menos de 14 dias
                const deletaveis = fetched.filter(msg =>
                    Date.now() - msg.createdTimestamp < 14 * 24 * 60 * 60 * 1000
                );

                const antigas = fetched.filter(msg => !deletaveis.has(msg.id));

                // Apaga mensagens recentes em lote
                if (deletaveis.size > 0) {
                    await channel.bulkDelete(deletaveis, true);
                    apagadas += deletaveis.size;
                }

                // Apaga mensagens antigas individualmente com pequeno delay
                for (const msg of antigas.values()) {
                    await msg.delete().catch(() => {});
                    apagadas++;
                    await new Promise(r => setTimeout(r, 300)); // 300ms delay para evitar limite
                }

            } while (fetched.size > 0);

            await channel.send(`✅ Canal limpo com sucesso! ${apagadas} mensagens apagadas.`);
        } catch (err) {
            console.error('Erro ao apagar mensagens:', err);
            await channel.send('❌ Ocorreu um erro ao tentar limpar o canal.');
        }
    }
};
