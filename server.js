const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

// 🔗 COLE AQUI SUA URL CSV
const PLANILHA_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTAWRcxkKdmNiPlt31_bOSUYIqVX9WFWzsdUw5bV95XL5zvAcoAHhaNRVzzGCQks38FpC4g3eP8Li24/pub?gid=0&single=true&output=csv";

// 💰 formatar moeda
function formatarMoeda(valor) {
  return valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL"
  });
}

// 📄 CSV → JSON
function csvParaJson(csv) {
  const linhas = csv.split("\n").filter(l => l.trim() !== "");
  const cabecalho = linhas[0].split(",");

  return linhas.slice(1).map(linha => {
    const valores = linha.split(",");
    let obj = {};

    cabecalho.forEach((col, i) => {
      obj[col.trim()] = valores[i]?.trim();
    });

    return obj;
  });
}

// 🚀 ENDPOINT
// ... (mantenha o início igual)

app.post("/rateio", async (req, res) => {
  try {
    // Adicionado valores padrão para evitar erros de undefined
    const { mensagem, etapa = "cpf", anos = [], meses = [] } = req.body;

    const response = await axios.get(PLANILHA_URL);
    const dados = csvParaJson(response.data);

    // 🔎 filtrar cliente (Normaliza o CPF removendo pontos/traços se necessário)
    const clienteDados = dados.filter(
      item => item["CPF/CNPJ"]?.trim() === mensagem?.trim()
    );

    // Se estiver na etapa inicial e não achar o CPF
    if (etapa === "cpf" && clienteDados.length === 0) {
      return res.json({
        reply: "❌ CPF/CNPJ não encontrado. Digite novamente.",
        nextStep: "cpf" // Força o bot a continuar pedindo o CPF
      });
    }

    // 🔹 ETAPA 1 → ANOS
    const anosDisponiveis = [...new Set(
      clienteDados.map(item => item.PERÍODO.split("/")[1])
    )];

    if (!etapa || etapa === "cpf") {
      let resposta = "📅 Escolha o ano:\n\n";

      anosDisponiveis.forEach((ano, i) => {
        resposta += `${i + 1} - ${ano}\n`;
      });

      return res.json({
        reply: resposta,
        nextStep: "ano",
        anos: anosDisponiveis
      });
    }

    // 🔹 ETAPA 2 → MESES
    if (etapa === "ano") {
      const anoSelecionado = anos[parseInt(mensagem) - 1];

      const mesesDisponiveis = [...new Set(
        clienteDados
          .filter(item => item.PERÍODO.includes(anoSelecionado))
          .map(item => item.PERÍODO)
      )];

      let resposta = `📅 Ano ${anoSelecionado}\n\nEscolha o mês:\n\n`;

      mesesDisponiveis.forEach((mes, i) => {
        resposta += `${i + 1} - ${mes}\n`;
      });

      return res.json({
        reply: resposta,
        nextStep: "mes",
        meses: mesesDisponiveis
      });
    }

    // 🔹 ETAPA 3 → RATEIO
    if (etapa === "mes") {
      const mesSelecionado = meses[parseInt(mensagem) - 1];

      const clienteDadosMes = clienteDados.filter(
        item => item.PERÍODO === mesSelecionado
      );

      // 📦 agrupar por loja
      const lojas = {};

      clienteDadosMes.forEach(item => {
        const chaveLoja = `${item.LOJA} (${item.UNIDADE})`;

        if (!lojas[chaveLoja]) {
          lojas[chaveLoja] = [];
        }

        lojas[chaveLoja].push({
          despesa: item.DESPESA,
          total: parseFloat(item.TOTAL.replace(",", ".")),
          rateio: parseFloat(item.RATEIO.replace(",", "."))
        });
      });

      let respostaFinal = "";

      for (let loja in lojas) {
        const dadosLoja = lojas[loja];

        let totalRateio = 0;
        let detalhes = "";

        const despesasUnicas = {};

        dadosLoja.forEach(item => {
          totalRateio += item.rateio;

          if (!despesasUnicas[item.despesa]) {
            despesasUnicas[item.despesa] = item.total;
          }

          detalhes += `• ${item.despesa}
Total: ${formatarMoeda(item.total)}
Seu rateio: ${formatarMoeda(item.rateio)}

`;
        });

        const totalDespesas = Object.values(despesasUnicas)
          .reduce((a, b) => a + b, 0);

        respostaFinal += `📊 Rateio da Loja

🏬 ${loja}
📅 Referência: ${mesSelecionado}

💰 Total das despesas: ${formatarMoeda(totalDespesas)}
📌 Seu rateio total: ${formatarMoeda(totalRateio)}

📋 Detalhamento:

${detalhes}
------------------------

`;
      }

      respostaFinal += `Deseja mais alguma coisa?

1 - Novo rateio
2 - Encerrar`;

      return res.json({
        reply: respostaFinal,
        nextStep: "fim"
      });
    }

  } catch (error) {
    console.error(error);
    return res.json({
      reply: "⚠️ Erro ao buscar os dados."
    });
  }
});

// 🚀 porta AWS
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Servidor rodando");
});
