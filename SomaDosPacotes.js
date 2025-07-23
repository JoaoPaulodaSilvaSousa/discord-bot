const cron = require('node-cron');
const UltimosDados = {};    // Guarda o último conteúdo válido por canal

module.exports = function SomaDosPacotes(client) {
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
            let titulo = 'PLACE';
            const tituloMatch = message.content.match(/^([^\s:]+)\s*:/);
            if (tituloMatch) {
                titulo = tituloMatch[1].toUpperCase();
            }

            const resposta = `*${titulo}: ${partes.join(' | ')}*\n*TOTAL ${titulo} = ${total}*`;

            UltimosDados[message.channel.id] = {
                resposta: resposta,
                mensagemId: UltimosDados[message.channel.id]?.mensagemId || null
            }; //Essa sintaxe com colchetes [] é a forma de acessar (ou definir) uma propriedade de um objeto dinamicamente, ou seja, com uma variável.

            // Opcional: log para verificar que armazenou
            console.log(`Armazenado para canal ${message.channel.id}: ${resposta}`);


            // Se já temos info anterior, só atualiza a resposta
            const canalId = message.channel.id;


            // Se já enviou uma mensagem antes, edita ela
            if (UltimosDados[canalId].mensagemId) {
                try {
                    const canal = await client.channels.fetch(canalId);
                    const msg = await canal.messages.fetch(UltimosDados[canalId].mensagemId);

                    await msg.edit(UltimosDados[canalId].resposta); // Atualiza a antiga
                    // Envia uma nova no final do chat (visível)
        const novaMsg = await message.channel.send(UltimosDados[canalId].resposta);

        // Aguarda 1 minuto (60000 ms) e deleta a nova mensagem
        setTimeout(() => {
            novaMsg.delete().catch(console.error);
        }, 1000);



                } catch (error) {
                    console.log('Erro ao editar mensagem:', error);
                    // Se der erro, enviar uma nova mensagem (ex: mensagem deletada)
                    const sentMsg = await message.channel.send(resposta);
                    UltimosDados[canalId].mensagemId = sentMsg.id;

                    // Também apaga a mensagem enviada no fallback
        setTimeout(() => {
            sentMsg.delete().catch(console.error);
        }, 60000);

        UltimosDados[canalId].mensagemId = sentMsg.id;
                }
            } else {
                // Se ainda não enviou mensagem, envia e salva ID
                const sentMsg = await message.channel.send(resposta);
                UltimosDados[canalId].mensagemId = sentMsg.id;
                console.log(`Mensagem enviada no canal ${canalId}`);
            }
        }
    });

    cron.schedule('* * * * *', async () => {
        console.log(`Executando envio de pacote às ...`)

        for (const canalId in UltimosDados) {
            const canal = await client.channels.fetch(canalId);
            if (!canal) continue;

            const dado = UltimosDados[canalId];
            if (!dado || !dado.resposta) continue;

            const { mensagemId, resposta } = dado;

            try {
                if (mensagemId) {
                    const msg = await canal.messages.fetch(mensagemId);
                    await msg.edit(resposta);
                    console.log(`Mensagem atualizada no canal ${canalId}`);
                } else {
                    const novaMsg = await canal.send(resposta);
                    UltimosDados[canalId].mensagemId = novaMsg.id;
                }
            } catch (error) {
                console.log(`Erro ao atualizar canal ${canalId}:`, error)
            }
        }

    })
}

