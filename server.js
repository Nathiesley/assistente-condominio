const express = require("express");
const app = express();

app.use(express.json());

app.post("/rateio", (req, res) => {
  const { mensagem, etapa } = req.body;

  // Simulação inicial
  if (!etapa || etapa === "inicio") {
    return res.json({
      reply: "Digite seu CPF ou CNPJ:",
      nextStep: "cpf"
    });
  }

  if (etapa === "cpf") {
    if (mensagem === "123") {
      return res.json({
        reply: "Encontrei essas unidades:\n1 - BX 12\n2 - LJ 05\nDigite o número:",
        nextStep: "unidade",
        unidades: ["BX 12", "LJ 05"]
      });
    }

    return res.json({
      reply: "CPF/CNPJ não encontrado. Tente novamente:",
      nextStep: "cpf"
    });
  }

  if (etapa === "unidade") {
    return res.json({
      reply: "Digite o período (ex: 03/2026):",
      nextStep: "periodo"
    });
  }

  if (etapa === "periodo") {
    return res.json({
      reply: `Rateio ${mensagem}\nBX 12\nTotal: R$ 850,00`,
      nextStep: "fim"
    });
  }

  res.json({
    reply: "Fluxo finalizado."
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log("Servidor rodando"));