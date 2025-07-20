const cron = require('node-cron');

module.exports = (client, config) => {
    const {
        corteHora,
        corteMinuto,
        postagemHora,
        postagemMinuto,
        canalid
    } = config;

    client.once('ready', () => {
        console.log(`Logado como ${client.user.tag}`);

        const cronHoraCorte = `${corteMinuto} ${corteHora} * * *`;
        const cronHoraPostagem = `${postagemMinuto} ${postagemHora} * * *`;

        //cron principal
        cron.schedule('40 21 * * *', async () => {
            const canal = await client.channels.fetch(canalid).catch(() => null);

            if (!canal) return console.log('Canal não encontrado!');
            await canal.send('Bom dia! Está é a mensagem automática das 10h.')


            const horaCorte = `${String(corteHora).padStart(2, '0')}:${String(corteMinuto).padStart(2, '0')}`;
            const horaPostagem = `${String(postagemHora).padStart(2, '0')}:${String(postagemMinuto).padStart(2, '0')}`;

            await canal.send(`O horário de corte hoje é: ${horaCorte} e o horário de postagem é: ${horaPostagem}`);
        }, {
            timezone: "America/Sao_Paulo"
        });

        // Para horario de corte e postagem

        //corte
        cron.schedule(cronHoraCorte, async () => {
            const canal = await client.channels.fetch(canalid).catch(() => null);

            if (!canal) return console.log('Canal não encontrado!');
            await canal.send('Atenção: Prepare o envio dos pacotes! Já deu o horário de corte.');

        }, {
            timezone: "America/Sao_Paulo"
        });

        //postagem
        cron.schedule(cronHoraPostagem, async () => {
            const canal = await client.channels.fetch(canalid).catch(() => null);
            if (!canal) return console.log('Canal não encontrado!');
            await canal.send('O horário de postagem foi encerrado!');
        }, {
            timezone: "America/Sao_Paulo"
        })

    });
}