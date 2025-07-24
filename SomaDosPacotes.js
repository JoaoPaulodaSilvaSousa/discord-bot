const cron = require('node-cron');
const UltimosDados = {};    // Guarda o último conteúdo válido por canal


module.exports = function SomaDosPacotes(client, config) {

    const { postagemHora, postagemMinuto } = config;

    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;

        // Regex para pegar padrões "NOME = NÚMERO"
        const regex = /([\w\-]+)\s*=\s*(\d+)/g;
        // Expressão regular para capturar padrões "NOME = NÚMERO":
        // 
        // /([\w\-]+)\s*=\s*(\d+)/g
        //
        // Detalhes:
        // - /.../g: indica que é uma regex com flag 'g' para buscar todas as ocorrências (global). Quando você vê /algo/g significa que a regex vai buscar todas as vezes que encontrar "algo" no texto, não só a primeira.
        // - ([\w\-]+): primeiro grupo capturado, corresponde a um "nome":
        //     - \w: caractere alfanumérico (letras, números e underscore _)
        //     - \-: caractere hífen (-), escapado com \
        //     - +: um ou mais desses caracteres (letras, números, underline ou hífen)
        // - \s*: zero ou mais espaços em branco (antes do sinal de igual)
        // - =: caractere igual que separa o nome do número
        // - \s*: zero ou mais espaços em branco (depois do sinal de igual)
        // - (\d+): segundo grupo capturado, corresponde a um número inteiro:
        //     - \d: dígito numérico (0 a 9)
        //     - +: um ou mais dígitos
        //
        // Exemplo: para o texto "E-NOVA = 4 EZITO=3"
        // Captura: 
        //   - Grupo 1: "E-NOVA", Grupo 2: "4"
        //   - Grupo 1: "EZITO", Grupo 2: "3"

        // Variável para armazenar cada resultado encontrado pelo regex durante a busca no texto
        let match;

        // Variável para acumular o total somando todos os valores numéricos encontrados
        let total = 0;

        // Array para guardar as partes formatadas, no formato "NOME = VALOR"
        let partes = [];

        // Enquanto o regex encontrar novos matches no conteúdo da mensagem
        while ((match = regex.exec(message.content)) !== null) {

            // match[1] é o grupo que captura o nome (ex: "E-NOVA")
            const nome = match[1];

            // match[2] é o grupo que captura o número (ex: "4"), convertendo para inteiro base 10
            const valor = parseInt(match[2], 10);

            // Acumula o valor total somando todos os números encontrados
            total += valor;

            // Adiciona a parte formatada "NOME = VALOR" no array partes
            partes.push(`${nome} = ${valor}`);
        }

        if (partes.length > 0) {
            // Monta a resposta formatada
            const tituloMatch = message.content.match(/^([^\s:]+)\s*:/);
            if (!tituloMatch || tituloMatch[1].toUpperCase() !== 'PLACE') {
                console.log(`Mensagem sem título válido no canal ${message.channel.id}: "${message.content}". Use o título correto para a validação.`)
                return // Sai da função após logar
            }
                 
                
            const titulo = tituloMatch[1].toUpperCase();

            if (titulo !== 'PLACE') return; // Só continua se o título for PLACE
            

            const resposta = `*${titulo}: ${partes.join(' | ')}*\n*TOTAL ${titulo} = ${total}*`;

            UltimosDados[message.channel.id] = { //Essa sintaxe com colchetes [] é a forma de acessar (ou definir) uma propriedade de um objeto dinamicamente, ou seja, com uma variável.
                resposta: resposta
            };

            // Opcional: log para verificar que armazenou
            console.log(`Armazenado para canal ${message.channel.id}: ${resposta}`);
        }
    });

    // Agenda o cron com a hora e minuto configurado

    let minutoAgendado = Number(postagemMinuto) + 1;
    let horaAgendada = Number(postagemHora);

    if( minutoAgendado >= 60) {
        minutoAgendado = 0;
        horaAgendada += 1;
        if (horaAgendada >= 24) horaAgendada = 0;
    }

    const expressaoCron = `${minutoAgendado} ${horaAgendada} * * *`;
    console.log(`Expressão cron configurada: ${expressaoCron}`);


    cron.schedule(expressaoCron, async () => {
        console.log(`Executando envio de pacote Place às ${horaAgendada}:${minutoAgendado.toString().padStart(2, '0')}`);

        const canaisComDados = Object.keys(UltimosDados).filter(canalId => {
            return UltimosDados[canalId] && UltimosDados[canalId].resposta;
        });

        if (canaisComDados.length === 0) {
            console.log(`Nenhuma mensagem foi enviada. Nenhum dado registrado no período.`);
            return
        }

        for (const canalId of canaisComDados) {
            const canal = await client.channels.fetch(canalId);
            if (!canal) continue;

            const dado = UltimosDados[canalId];
            try {
                await canal.send(dado.resposta);
                console.log(`Mensagem enviada no canal ${canalId}`);
            } catch (error) {
                console.log(`Erro ao enviar mensagem no canal ${canalId}:`, error)
            }
        }

    })
}

