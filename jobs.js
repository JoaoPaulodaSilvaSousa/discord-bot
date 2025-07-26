const { EmbedBuilder } = require('discord.js');
const schedule = require('node-schedule');
const fetch = require('node-fetch');
const { DateTime } = require('luxon');

async function buscarFeriados(ano) {
    try {
        const url = `https://date.nager.at/api/v3/PublicHolidays/${ano}/BR`;
        const response = await fetch(url);
        const feriados = await response.json();

        return feriados.map(f => ({
            data: new Date(f.date).toLocaleDateString('pt-BR'),
            nome: f.localName
        }));
    } catch (err) {
        console.error('Erro ao buscar feriados:', err);
        return [];
    }
}

let feriadosBrasil = [];

function FeriadoHoje() {
    const hoje = new Date().toLocaleDateString('pt-BR');
    const feriado = feriadosBrasil.find(f => f.data === hoje);
    return feriado ? feriado.nome : null;
}

module.exports = (client, config) => {
    const {
        corteHora,
        corteMinuto,
        postagemHora,
        postagemMinuto,
        canalid
    } = config;

    client.once('ready', async () => {
        console.log(`Logado como ${client.user.tag}`);
        const anoAtual = new Date().getFullYear();
        feriadosBrasil = await buscarFeriados(anoAtual);
        console.log('Feriados carregados:', feriadosBrasil);

        const agendarTarefaDiaria = (hora, minuto, tarefa) => {
            let agora = DateTime.now().setZone('America/Sao_Paulo');
            let proximaExecucao = agora.set({ hour: hora, minute: minuto, second: 0, millisecond: 0 });

            if (proximaExecucao < agora) {
                proximaExecucao = proximaExecucao.plus({ days: 1 });
            }

            schedule.scheduleJob(proximaExecucao.toJSDate(), async function executar() {
                await tarefa();

                // Reagendar para o mesmo horário do dia seguinte
                const novoHorario = proximaExecucao.plus({ days: 1 });
                schedule.scheduleJob(novoHorario.toJSDate(), executar);
            });
        };

        // 🌅 Mensagem automática das 10h
        agendarTarefaDiaria(22, 0, async () => {
            const canal = await client.channels.fetch(canalid).catch(() => null);
            const hojeFormatada = new Date().toLocaleDateString('pt-BR');
            const nomeFeriado = FeriadoHoje();

            if (!canal) return console.log('Canal não encontrado!');
            if (nomeFeriado) {
                await canal.send(`📢 Hoje é feriado: **${nomeFeriado}**. Nenhuma mensagem será enviada.`);
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('☀️ Bom dia!')
                .setDescription('Esta é a mensagem automática das 10h!')
                .addFields(
                    { name: 'Data de Hoje:', value: hojeFormatada },
                    { name: '🕒 Horário de corte:', value: `${String(corteHora).padStart(2, '0')}:${String(corteMinuto).padStart(2, '0')}`, inline: true },
                    { name: '🚚 Horário de postagem:', value: `${String(postagemHora).padStart(2, '0')}:${String(postagemMinuto).padStart(2, '0')}`, inline: true }
                )
                .setColor('Yellow')
                .setTimestamp();

            await canal.send({ embeds: [embed] });
        });

        // ⏰ Corte
        agendarTarefaDiaria(corteHora, corteMinuto, async () => {
            const canal = await client.channels.fetch(canalid).catch(() => null);
            const nomeFeriado = FeriadoHoje();

            if (!canal) return console.log('Canal não encontrado!');
            if (nomeFeriado) {
                await canal.send(`📢 Hoje é feriado: **${nomeFeriado}**. Não há corte de pacotes hoje.`);
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('Prepare todos os pacotes!')
                .setDescription(`🚨 __**ATENÇÃO!**__ 🚨 O horário de corte das **${String(corteHora).padStart(2, '0')}:${String(corteMinuto).padStart(2, '0')}** foi atingido. Todos os pacotes devem estar feitos.`)
                .setColor('Orange')
                .setTimestamp();

            await canal.send({ embeds: [embed] });
        });

        // 🚚 Postagem
        agendarTarefaDiaria(postagemHora, postagemMinuto, async () => {
            const canal = await client.channels.fetch(canalid).catch(() => null);
            const nomeFeriado = FeriadoHoje();

            if (!canal) return console.log('Canal não encontrado!');
            if (nomeFeriado) {
                await canal.send(`📢 Hoje é feriado: **${nomeFeriado}**. Não há encerramento de postagem hoje.`);
                return;
            }

            const embed = new EmbedBuilder()
                .setTitle('⚠️ __Hora de postagem finalizado!__ ⚠️')
                .setDescription(`Se você não realizou a postagem das **${String(postagemHora).padStart(2, '0')}:${String(postagemMinuto).padStart(2, '0')}**, infelizmente os pacotes entrarão em atraso!`)
                .setColor('Red')
                .setTimestamp();

            await canal.send({ embeds: [embed] });
        });
    });
};
