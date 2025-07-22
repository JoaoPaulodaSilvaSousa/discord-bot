const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');

//buscar se e feriado
const fetch = require('node-fetch');

async function buscarFeriados(ano) {
    try {
        const url = `https://date.nager.at/api/v3/PublicHolidays/${ano}/BR`;
        const response = await fetch(url);
        const feriados = await response.json();

        // Pega as datas no formato dd/mm/aaaa para facilitar a comparação
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

        const cronHoraCorte = `${corteMinuto} ${corteHora} * * *`;
        const cronHoraPostagem = `${postagemMinuto} ${postagemHora} * * *`;

        //cron principal
        cron.schedule('0 10 * * *', async () => {
            const canal = await client.channels.fetch(canalid).catch(() => null);
            const hojeFormatada = new Date().toLocaleDateString('pt-BR');

            const nomeFeriado = FeriadoHoje();
            if (nomeFeriado) {
                await canal.send(`📢 Hoje é feriado: **${nomeFeriado}**. Nenhuma mensagem será enviada.`);
                return;
            }

            if (!canal) return console.log('Canal não encontrado!');

            const horaCorte = `${String(corteHora).padStart(2, '0')}:${String(corteMinuto).padStart(2, '0')}`;
            const horaPostagem = `${String(postagemHora).padStart(2, '0')}:${String(postagemMinuto).padStart(2, '0')}`;

            const embed = new EmbedBuilder()
                .setTitle('☀️ Bom dia!')
                .setDescription('Esta é a mensagem automática das 10h!')
                .addFields(
                    { name: 'Data de Hoje:', value: hojeFormatada, inline: false },
                    { name: '🕒 Horário de corte:  |  ', value: horaCorte, inline: true },
                    { name: '🚚 Horário de postagem:', value: horaPostagem, inline: true }
                )
                .setColor('Yellow')
                .setTimestamp();

            await canal.send({ embeds: [embed] });

        }, {
            timezone: "America/Sao_Paulo"
        });

        // Para horario de corte e postagem
        //corte
        cron.schedule(cronHoraCorte, async () => {
            const canal = await client.channels.fetch(canalid).catch(() => null);
            const nomeFeriado = FeriadoHoje();
            const horaCorte = `${String(corteHora).padStart(2, '0')}:${String(corteMinuto).padStart(2, '0')}`;
            if (nomeFeriado) {
                await canal.send(`📢 Hoje é feriado: **${nomeFeriado}**. Não há corte de pacotes hoje.`);
                return;
            }

            if (!canal) return console.log('Canal não encontrado!');
            
            const embed =  new EmbedBuilder()
            .setTitle('Prepare todos os pacotes!')
            .setDescription(`

🚨 __**ATENÇÃO!**__ 🚨 O horário de corte das **${horaCorte}** foi atingido. Todos os pacotes devem estar feitos.`)

            .setColor('Orange')
            .setTimestamp();
            await canal.send({ embeds: [embed] });

        }, {
            timezone: "America/Sao_Paulo"
        });

        //postagem
        cron.schedule(cronHoraPostagem, async () => {
            const canal = await client.channels.fetch(canalid).catch(() => null);
            const nomeFeriado = FeriadoHoje();
            const horaPostagem = `${String(postagemHora).padStart(2, '0')}:${String(postagemMinuto).padStart(2, '0')}`;
            if (nomeFeriado) {
                await canal.send(`📢 Hoje é feriado: **${nomeFeriado}**. Não há encerramento de postagem hoje.`);
                return;
            }
            if (!canal) return console.log('Canal não encontrado!');

            const embed = new EmbedBuilder()
            .setTitle('⚠️ __Hora de postagem finalizado!__ ⚠️')
            .setDescription(`Se você não realizou a postagem das **${horaPostagem}** dos pacotes, infelizmente os mesmos entrarão em atraso!`)

            .setColor('Red')
            .setTimestamp();
            await canal.send({ embeds: [embed] });

        }, {
            timezone: "America/Sao_Paulo"
        })

    });
}



//--------- ADICIONAR @EVERYONE!!! ---------