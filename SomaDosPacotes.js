const ConfigHorarios = require('./configHorario.json')
const cron = require('node-cron');
const UltimosDados = {};    // Guarda o último conteúdo válido por canal

// Configuração de horários diferentes para cada título (pode adicionar/remover)
const HorariosPorTitulo = {
    PLACE: { hora: 11, minuto: 50 },
    ENTREGA_DIRETA: { hora: 15, minuto: 30 },


    // adicione outros títulos e horários que quiser aqui
}


module.exports = function SomaDosPacotes(client) {
    // Evento que escuta as mensagens
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;


        // Pega o título da mensagem: até ":" e em maiúsculo
        // Exemplo: "PLACE: ITEM1=5" => título = PLACE

        const tituloMatch = message.content.match(/^([\w\s\-]+)\s*:/);
        if (!tituloMatch) {
            console.error(`Mensagem sem título válido: "${message.content}"`)
            return;     // Se não tem título, sai
        } 

        const tituloOriginal = tituloMatch[1].trim(); //preserva o nome original para exibição

        const tituloKey = tituloOriginal.toUpperCase().replace(/\s+/g, '_'); // transforma "ENTREGA DIRETA" em "ENTREGA_DIRETA"

        // Só processa se o título existir na configuração de horários

        if (!HorariosPorTitulo[tituloKey]) {
             console.error(`Título "${tituloOriginal}" não configurado nos horários.`);
             return;
        }

        // Regex para achar "NOME = NÚMERO"

        const regex = /([\w\-]+)\s*=\s*(\d+)/g;

        let match;
        let total = 0;
        const partes = [];

        // Procura todas as ocorrências do padrão na mensagem
        while ((match = regex.exec(message.content)) !== null) {
            const nome = match[1];
            const valor = parseInt(match[2], 10);
            total += valor;
            partes.push(`${nome} = ${valor}`);
        }

        if (partes.length === 0) return; // Se não achou nada, sai

        // Monta a resposta formatada
        const resposta = `●__${tituloOriginal.toUpperCase()}__:\n${partes.join('\n')}\n●TOTAL ${tituloOriginal.toUpperCase()} = ${total}`;

        // Armazena usando chave única canal+título

        const chave = `${message.channel.id}_${tituloKey}`;
        UltimosDados[chave] = { resposta, canalId: message.channel.id };

        console.log(`Armazenado para ${chave}: \n${resposta}`);
    });

    // Agora vamos criar agendamentos CRON para cada título configurado

    for (const tituloKey in HorariosPorTitulo) {
        const corte = ConfigHorarios[tituloKey];
        if (!corte) continue;

        let minutoCorte = corte.corteMinuto;
        let horaCorte = corte.corteHora;

        let minutoEnvio = minutoCorte;
        let horaEnvio = horaCorte;

        // Se for o PLACE, envie 10 minutos depois do corte
        if (tituloKey === "PLACE") {
            minutoEnvio +=10;
            if (minutoEnvio >= 60) {
                minutoEnvio %= 60;
                horaEnvio = (horaEnvio + 1) % 24;
            }
        }

        if (tituloKey === "ENTREGA_DIRETA") {
            minutoEnvio = minutoCorte;
            horaEnvio = horaCorte;
        }



        const expressaoCron = `${minutoEnvio} ${horaEnvio} * * *`;
        console.log(`Agendado envio para ${tituloKey} às ${horaEnvio}:${minutoEnvio.toString().padStart(2, '0')} (cron: "${expressaoCron}")`);

        cron.schedule(expressaoCron, async () => {
            console.log(`Executando envio de pacote ${tituloKey} às ${horaEnvio}:${minutoEnvio.toString().padStart(2, '0')}`);

            // Filtra os dados armazenados para esse título (chave contém _titulo no final)


            const chavesParaTitulo = Object.keys(UltimosDados).filter(chave => chave.endsWith(tituloKey));

            if (chavesParaTitulo.length === 0) {
                console.log(`Nenhum dado para ${tituloKey} neste horário.`);
                return;
            }

            for (const chave of chavesParaTitulo) {
                const { resposta, canalId } = UltimosDados[chave];

                try {
                    const canal = await client.channels.fetch(canalId);
                    if (!canal) {
                        console.log(`Canal ${canalId} não encontrado para ${chave}.`);
                        continue;
                    }
                    await canal.send(resposta);
                    console.log(`Mensagem enviada no canal ${canalId} para ${tituloKey}`);

                    // Após enviar, pode limpar o dado para não reenviar

                    delete UltimosDados[chave];
                } catch (err) {
                    console.error(`Erro ao enviar mensagem para canal ${canalId} (${tituloKey}):`, err);
                }
            }
        })
    }
}