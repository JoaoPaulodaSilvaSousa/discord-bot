const ConfigHorarios = require('./configHorario.json');
const schedule = require('node-schedule');
const UltimosDados = {}; // Guarda o último conteúdo válido por canal
const { DateTime } = require('luxon'); // Recomendado para lidar com timezone de forma confiável

module.exports = function SomaDosPacotes(client) {
    client.on('error', error => {
        console.error('Erro emitido no client:', error);
    });

    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;

        const tituloMatch = message.content.match(/^([\w\s\-]+)\s*:/);
        if (!tituloMatch) return;

        const tituloOriginal = tituloMatch[1].trim();
        const tituloKey = tituloOriginal.toUpperCase().replace(/\s+/g, '_');

        if (!ConfigHorarios[tituloKey]) return;

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

        const resposta = `●__${tituloOriginal.toUpperCase()}__:\n${partes.join('\n')}\n●TOTAL ${tituloOriginal.toUpperCase()} = ${total}`;
        const chave = `${message.channel.id}_${tituloKey}`;
        UltimosDados[chave] = { resposta, canalId: message.channel.id };
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

        // Cria a data da próxima execução usando luxon com timezone Brasil
        const now = DateTime.now().setZone('America/Sao_Paulo');
        let proximaExecucao = now.set({ hour: hora, minute: minuto, second: 0, millisecond: 0 });

        // Se o horário já passou hoje, agenda para amanhã
        if (proximaExecucao < now) {
            proximaExecucao = proximaExecucao.plus({ days: 1 });
        }

        console.log(`[DEBUG] Agendando "${tituloKey}" para: ${proximaExecucao.toISO()} (${proximaExecucao.toFormat('HH:mm')})`);

        const enviar = () => {
            console.log(`⏰ Executando envio de "${tituloKey}"`);

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
                    canal.send(resposta);
                    console.log(`📨 Enviado para canal "${canalId}" (${tituloKey})`);
                    delete UltimosDados[chave];
                }).catch(err => {
                    console.error(`❌ Erro ao enviar para canal ${canalId}:`, err);
                });
            }

            // Reagendar para o dia seguinte
            const proximo = DateTime.now().setZone('America/Sao_Paulo').plus({ days: 1 }).set({ hour: hora, minute: minuto, second: 0, millisecond: 0 });
            console.log(`[DEBUG] Reagendando "${tituloKey}" para: ${proximo.toISO()}`);
            schedule.scheduleJob(proximo.toJSDate(), enviar);
        };

        schedule.scheduleJob(proximaExecucao.toJSDate(), enviar);
    }
};
