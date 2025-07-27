const { EmbedBuilder } = require('discord.js');

// Importa o agendador de tarefas (substitui cron), ideal para executar funções em datas e horários específicos
const schedule = require('node-schedule');

// Importa o fetch para requisições HTTP (neste caso, usado para consultar a API de feriados)
const fetch = require('node-fetch');

// Luxon: biblioteca para manipular datas e horários com suporte a fuso horário
const { DateTime } = require('luxon');

// Função assíncrona que busca feriados nacionais do Brasil para o ano informado
async function buscarFeriados(ano) {
    try {
        const url = `https://date.nager.at/api/v3/PublicHolidays/${ano}/BR`;

        // Faz uma requisição HTTP GET para a URL definida anteriormente usando fetch (com suporte a await, pois estamos em uma função assíncrona)
        // O resultado da requisição (resposta do servidor) é armazenado na variável "response"
        const response = await fetch(url);
        const feriados = await response.json();

        // Retorna um novo array de objetos, mantendo apenas os campos relevantes de cada feriado:
        // "data" formatada para o padrão brasileiro (dd/mm/aaaa) e o "nome" do feriado
        return feriados.map(f => ({
            data: new Date(f.date).toLocaleDateString('pt-BR'),
            nome: f.localName
        }));
    } catch (err) {
        console.error('Erro ao buscar feriados:', err);
        // Retorna um array vazio para garantir que a função continue retornando um array,
        // evitando que o programa quebre ao tentar usar o resultado.
        return [];
    }
}

let feriadosBrasil = [];

function FeriadoHoje() {
    const hoje = new Date().toLocaleDateString('pt-BR');
    const feriado = feriadosBrasil.find(f => f.data === hoje);
    return feriado ? feriado.nome : null; // ?: é uma forma curta e prática de fazer um if simples em uma linha só.
}

module.exports = (client, config) => {
    const {
        corteHora,
        corteMinuto,
        postagemHora,
        postagemMinuto,
        canalid
    } = config;

    // Log de configuração recebido
    console.log(`🚨 Configuração recebida: corteHora=${corteHora}, corteMinuto=${corteMinuto}, postagemHora=${postagemHora}, postagemMinuto=${postagemMinuto}, canalid=${canalid}`);

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

            console.log(`🕓 Agendado para: ${proximaExecucao.toISO()} (hora: ${hora}, minuto: ${minuto})`);

            schedule.scheduleJob(proximaExecucao.toJSDate(), async function executar() {
                console.log('⏰ Executando tarefa agendada');
                try {
                    await tarefa();
                } catch (err) {
                    console.error('❌ Erro ao executar tarefa agendada:', err);
                }

                // Reagendar para o mesmo horário do dia seguinte
                const novoHorario = proximaExecucao.plus({ days: 1 });
                schedule.scheduleJob(novoHorario.toJSDate(), executar);
            });
        };

        // 🌅 Mensagem automática das 10h
        agendarTarefaDiaria(14, 34, async () => {
            const canal = await client.channels.fetch(canalid).catch(() => null);
            console.log(`🔍 Tentando encontrar o canal com ID: ${canalid}`);

            const hojeFormatada = new Date().toLocaleDateString('pt-BR');
            const nomeFeriado = FeriadoHoje();

            if (!canal) {
                console.log('❌ Canal não encontrado!');
                return;
            }

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

            if (!canal) {
                console.log('❌ Canal não encontrado!');
                return;
            }

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

            if (!canal) {
                console.log('❌ Canal não encontrado!');
                return;
            }

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
