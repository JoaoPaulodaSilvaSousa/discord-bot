const ConfigHorarios = require('./configHorario.json');
const schedule = require('node-schedule');
const UltimosDados = {};
const { DateTime } = require('luxon');
const fetch = require('node-fetch');

let feriadosBrasil = [];

function isFimDeSemana() {
    const hoje = DateTime.now().setZone('America/Sao_Paulo');
    return hoje.weekday === 6 || hoje.weekday === 7;
}

function FeriadoHoje() {
    const hoje = new Date().toLocaleDateString('pt-BR');
    const feriado = feriadosBrasil.find(f => f.data === hoje);
    return feriado?.nome || null;
}

async function carregarFeriados(ano) {
    try {
        const url = `https://date.nager.at/api/v3/PublicHolidays/${ano}/BR`;
        const response = await fetch(url);
        const feriados = await response.json();
        const feriadosManuais = require('./feriadosManuais.json');

        const feriadosNacionais = feriados.map(f => ({
            data: new Date(f.date).toLocaleDateString('pt-BR'),
            nome: f.localName
        }));

        const todos = [...feriadosNacionais, ...feriadosManuais];
        return todos.filter((feriado, index, self) =>
            index === self.findIndex(f => f.data === feriado.data)
        );
    } catch (err) {
        console.error('Erro ao carregar feriados:', err);
        return require('./feriadosManuais.json');
    }
}

module.exports = async function SomaDosPacotes(client) {
    const anoAtual = new Date().getFullYear();

    // Carrega feriados do ano atual e do próximo ano
    feriadosBrasil = [
        ...await carregarFeriados(anoAtual),
        ...await carregarFeriados(anoAtual + 1)
    ];

    console.log('✅ Feriados carregados:', feriadosBrasil);

    client.on('error', error => {
        console.error('Erro emitido no client:', error);
    });

    async function processarMensagem(message) {
        if (message.author.bot) return;

        const tituloMatch = message.content.match(/^([\w\s\-]+)\s*:/);
        if (!tituloMatch) {
            const aviso = await message.reply({
                content: '⚠️ Você esqueceu de colocar o título no início da mensagem. Exemplo: `PLACE: Nome = valor`',
                allowedMentions: { repliedUser: false }
            });

            setTimeout(() => {
                aviso.delete().catch(() => { });
                message.delete().catch(() => { });
            }, 10000);
            return;
        }

        const tituloOriginal = tituloMatch[1].trim();
        const tituloKey = tituloOriginal.toUpperCase().replace(/\s+/g, '_');

        if (!ConfigHorarios[tituloKey]) {
            const aviso = await message.reply({
                content: `❌ O título **${tituloOriginal}** não é reconhecido. Verifique se escreveu corretamente. Esta mesangem séra apagada dentro de 10 segundos!`,
                allowedMentions: { repliedUser: false }
            });

            setTimeout(() => {
                aviso.delete().catch(() => { });
                message.delete().catch(() => { });
            }, 10000);
            return;
        }

        const regex = /([\w\-]+)\s*=\s*(\d+)/g;
        let match;
        let total = 0;
        const partes = [];

        while ((match = regex.exec(message.content)) !== null) {
            const nome = match[1];
            const valor = parseInt(match[2], 10);

            if (!Number.isNaN(valor)) {
                total += valor;
                partes.push(`${nome} = ${valor}`);
            }
        }

        if (partes.length === 0) return;

        const resposta = `●__${tituloOriginal.toUpperCase()}__:\n${partes.join('\n')}\n●__TOTAL ${tituloOriginal.toUpperCase()}__ = ${total}`;
        const chave = `${message.channel.id}_${tituloKey}`;
        UltimosDados[chave] = { resposta, canalId: message.channel.id };
        try {
            await message.react('✅');  // Reage com um ✅ na mensagem
            console.log(`✅ Mensagem registrada: ${resposta}`);
        } catch (err) {
            console.warn('⚠️ Não foi possível reagir à mensagem:', err);
        }
    }

    client.on('messageCreate', processarMensagem);
    client.on('messageUpdate', (oldMessage, newMessage) => {
        if (!newMessage.partial && newMessage.content) {
            processarMensagem(newMessage);
        }
    });

    console.log('[DEBUG] ConfigHorarios completo:', ConfigHorarios);

    for (const tituloKey in ConfigHorarios) {
        const corte = ConfigHorarios[tituloKey];
        if (!corte) continue;

        let hora = parseInt(corte.corteHora, 10);
        let minuto = parseInt(corte.corteMinuto, 10);
        const atraso = parseInt(corte.atrasoMinutos, 10) || 0;

        minuto += atraso;
        if (minuto >= 60) {
            minuto %= 60;
            hora = (hora + 1) % 24;
        }

        const now = DateTime.now().setZone('America/Sao_Paulo');
        let proximaExecucao = now.set({ hour: hora, minute: minuto, second: 0, millisecond: 0 });

        if (proximaExecucao < now) {
            proximaExecucao = proximaExecucao.plus({ days: 1 });
        }

        console.log(`[DEBUG] Agendando "${tituloKey}" para: ${proximaExecucao.toISO()} (${proximaExecucao.toFormat('HH:mm')})`);

        const enviar = () => {
            console.log(`⏰ Executando envio de "${tituloKey}"`);

            if (isFimDeSemana()) {
                console.log('⏸️ Não envia mensagem porque hoje é final de semana.');
                return;
            }

            const nomeFeriado = FeriadoHoje();
            if (nomeFeriado) {
                console.log(`⏸️ Não envia mensagem porque hoje é feriado: ${nomeFeriado}`);
                return;
            }

            const chaves = Object.keys(UltimosDados).filter(k => k.endsWith(`_${tituloKey}`));
            if (chaves.length === 0) {
                console.log(`ℹ️ Nenhum dado para "${tituloKey}" no horário agendado.`);
                return;
            }

            for (const chave of chaves) {
                const { resposta, canalId } = UltimosDados[chave];

                client.channels.fetch(canalId).then(canal => {
                    if (!canal) {
                        console.warn(`⚠️ Canal "${canalId}" não encontrado`);
                        return;
                    }

                    const { EmbedBuilder } = require('discord.js');

                    const embed = new EmbedBuilder()
                        .setColor(0x00BFFF)
                        .setTitle(`📦 Soma Total: ${tituloKey.replace(/_/g, ' ')}`)
                        .setDescription(resposta)
                        .setTimestamp();

                    canal.send({
                        content: '@everyone',
                        embeds: [embed],
                        allowedMentions: { parse: ['everyone'] }
                    });
                    console.log(`📨 Enviado para canal "${canalId}" (${tituloKey})`);
                    delete UltimosDados[chave];
                }).catch(err => {
                    console.error(`❌ Erro ao enviar para canal ${canalId}:`, err);
                });
            }

            const proximo = DateTime.now().setZone('America/Sao_Paulo').plus({ days: 1 }).set({ hour: hora, minute: minuto, second: 0, millisecond: 0 });
            console.log(`[DEBUG] Reagendando "${tituloKey}" para: ${proximo.toISO()}`);
            schedule.scheduleJob(proximo.toJSDate(), enviar);
        };

        schedule.scheduleJob(proximaExecucao.toJSDate(), enviar);
    }
};
