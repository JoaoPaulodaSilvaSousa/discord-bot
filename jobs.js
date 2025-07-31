const { EmbedBuilder } = require('discord.js');
const schedule = require('node-schedule');
const fetch = require('node-fetch');
const { DateTime } = require('luxon');
const configHorario = require('./configHorario.json'); // necessário para montar os horários dinâmicos

async function buscarFeriados(ano) {
    try {
        const url = `https://date.nager.at/api/v3/PublicHolidays/${ano}/BR`;
        const response = await fetch(url);
        const feriados = await response.json();
        const feriadosManuais = require('./feriadosManuais.json');

        const feriadosNacionais = feriados.map(f => ({
            data: new Date(f.date).toLocaleDateString('pt-BR'),
            nome: f.localName
        }));

        const todosFeriados = [...feriadosNacionais, ...feriadosManuais];

        const feriadosUnicos = todosFeriados.filter((feriado, index, self) =>
            index === self.findIndex(f => f.data === feriado.data)
        );

        return feriadosUnicos;
    } catch (err) {
        console.error('Erro ao buscar feriados:', err);
        return require('./feriadosManuais.json');
    }
}

function isFimDeSemana() {
    const hoje = DateTime.now().setZone('America/Sao_Paulo');
    return hoje.weekday === 6 || hoje.weekday === 7;
}

let feriadosBrasil = [];

function FeriadoHoje() {
    const hoje = new Date().toLocaleDateString('pt-BR');
    const feriado = feriadosBrasil.find(f => f.data === hoje);
    return feriado ? feriado.nome : null;
}

// Função exportada que agenda as tarefas, para ser chamada quando client estiver ready
async function agendarTarefas(client, config, TituloFormatado) {
    const {
        corteHora,
        corteMinuto,
        postagemHora,
        postagemMinuto,
        canalid
    } = config;

    console.log(`🚨 Configuração recebida: corteHora=${corteHora}, corteMinuto=${corteMinuto}, postagemHora=${postagemHora}, postagemMinuto=${postagemMinuto}, canalid=${canalid}`);

    // Busca feriados antes de agendar
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
            if (isFimDeSemana()) {
                console.log('Não executa porque hoje é final de semana.');
                return;
            }

            try {
                await tarefa();
            } catch (err) {
                console.error('❌ Erro ao executar tarefa agendada:', err);
            }

            const novoHorario = proximaExecucao.plus({ days: 1 });
            schedule.scheduleJob(novoHorario.toJSDate(), executar);
        });
    };

    // ✅ Mensagem automática das 9h com horários vindos do JSON
    agendarTarefaDiaria(9, 0, async () => {
        if (isFimDeSemana()) return;

        const canal = await client.channels.fetch(canalid).catch(() => null);
        if (!canal) {
            console.log('❌ Canal não encontrado!');
            return;
        }

        const nomeFeriado = FeriadoHoje();
        if (nomeFeriado) {
            console.log(`Não executa porque hoje é feriado: ${nomeFeriado}`);
            return;
        }

        const hojeFormatada = new Date().toLocaleDateString('pt-BR');

        const horariosFields = Object.entries(configHorario).map(([titulo, conf]) => {
            const nomeFormatado = titulo.replace(/_/g, ' ').toUpperCase();
            const corte = `${String(conf.corteHora).padStart(2, '0')}:${String(conf.corteMinuto).padStart(2, '0')}`;
            const postagem = `${String(conf.postagemHora).padStart(2, '0')}:${String(conf.postagemMinuto).padStart(2, '0')}`;

            return {
                name: `●__${nomeFormatado}__`,
                value: `Hora de corte: ${corte}\nHora de postagem: ${postagem}`,
                inline: false
            };
        });

        const embed = new EmbedBuilder()
            .setTitle('☀️ Bom dia!')
            .setDescription('Esta é a mensagem automática das 9h!')
            .addFields(
                { name: 'Data de Hoje:', value: hojeFormatada },
                { name: '🕒 Horário de corte Place:', value: `${String(corteHora).padStart(2, '0')}:${String(corteMinuto).padStart(2, '0')}`, inline: true },
                { name: '🚚 Horário de postagem Place:', value: `${String(postagemHora).padStart(2, '0')}:${String(postagemMinuto).padStart(2, '0')}`, inline: true },
                { name: '\n', value: '\n', inline: false },
                { name: '__Segue os horários de corte e postagem dinâmicos__:', value: '\u200B', inline: false },
                ...horariosFields,
                {
                    name: '●__Modelo para a soma dos pacotes__:',
                    value: 'LOGISTICA:\nTEFESTAS = NÚMERO DE PACOTES\nEZITO = NÚMERO DE PACOTES\nE-NOVA = NÚMERO DE PACOTES\nKIARUS = NÚMERO DE PACOTES',
                    inline: false
                }
            )
            .setColor('Yellow')
            .setTimestamp();

        await canal.send({
            content: '@everyone',
            embeds: [embed],
            allowedMentions: { parse: ['everyone'] }
        });
    });

    // Corte
    agendarTarefaDiaria(corteHora, corteMinuto, async () => {
        if (isFimDeSemana()) return;

        const canal = await client.channels.fetch(canalid).catch(() => null);
        if (!canal) {
            console.log('❌ Canal não encontrado!');
            return;
        }

        const nomeFeriado = FeriadoHoje();
        if (nomeFeriado) {
            console.log(`Não executa porque hoje é feriado: ${nomeFeriado}`);
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle('Prepare todos os pacotes!')
            .setDescription(`🚨 __**ATENÇÃO!**__ 🚨 O horário de corte **${TituloFormatado}** das **${String(corteHora).padStart(2, '0')}:${String(corteMinuto).padStart(2, '0')}** foi atingido. Todos os pacotes devem estar feitos.`)
            .setColor('Orange')
            .setTimestamp();

        await canal.send({
            content: '@everyone',
            embeds: [embed],
            allowedMentions: { parse: ['everyone'] }
        });
    });

    // Postagem
    agendarTarefaDiaria(postagemHora, postagemMinuto, async () => {
        if (isFimDeSemana()) return;

        const canal = await client.channels.fetch(canalid).catch(() => null);
        if (!canal) {
            console.log('❌ Canal não encontrado!');
            return;
        }

        const nomeFeriado = FeriadoHoje();
        if (nomeFeriado) {
            console.log(`Não executa porque hoje é feriado: ${nomeFeriado}`);
            return;
        }

        const embed = new EmbedBuilder()
            .setTitle(`⚠️ __Hora de postagem **${TituloFormatado}** finalizado!__ ⚠️`)
            .setDescription(`Se você não realizou a postagem das **${String(postagemHora).padStart(2, '0')}:${String(postagemMinuto).padStart(2, '0')}**, infelizmente os pacotes entrarão em atraso!`)
            .setColor('Red')
            .setTimestamp();

        await canal.send({
            content: '@everyone',
            embeds: [embed],
            allowedMentions: { parse: ['everyone'] }
        });
    });
}

module.exports = agendarTarefas;
