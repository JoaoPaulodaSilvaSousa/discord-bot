const { SlashCommandBuilder } = require('discord.js');

function formatarHora(date) {
    const hora = String(date.getHours()).padStart(2, '0'); //.padStart(2, '0')— É um método de string que garante que a string tenha pelo menos 2 caracteres. — Se ela tiver menos que 2 caracteres, ela "preenche" com zeros ('0') à esquerda.
    const minuto = String(date.getMinutes()).padStart(2, '0');

    return `${hora}:${minuto}`;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('horaml')
        .setDescription('Mostra a hora de CORTE e de POSTAGEM do place de acordo com o dia!'),
    async execute(interaction) {

        const agora = new Date();
        const horaAtual = agora.getHours();
        const minutoAtual = agora.getMinutes();

         // Definindo horários fixos (para testes)

         const corteHora = 11;
         const corteMinuto = 50;
         const postagemHora = 12;
         const postagemMinuto = 50;

         const horaCorte = `${String(corteHora).padStart(2, '0')}:${String(corteMinuto).padStart(2, '0')}`; 
         const horaPostagem = `${String(postagemHora).padStart(2, '0')}:${String(postagemMinuto).padStart(2, '0')}`; 

         // Converte tudo para minutos desde meia-noite para facilitar a comparação
         const minutosAtual = horaAtual * 60 + minutoAtual;
         const minutosCorte = corteHora * 60 + corteMinuto;
         const minutosPostagem = postagemHora * 60 + postagemMinuto;

        // Exibe os horários apenas se for exatamente o minuto de corte ou postagem (para testes)
        await interaction.reply(`O horário de corte hoje é: ${horaCorte} e o horário de postagem é: ${horaPostagem}`)

        //if (minutosAtual === minutosCorte || minutosAtual === minutosPostagem) {await interaction.reply(`O horário de corte hoje é: ${horaCorte} e o horário de postagem é: ${horaPostagem}`)}
    }
}

