# Estudo Vet

.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6a0f40ef-4a9d-414c-ba7a-40d06f84da65).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## IA externa: API oficial OpenAI

O VetEstudo utiliza a **API oficial da OpenAI**, diretamente no servidor, em vez de consumir créditos de IA do gateway Lovable. Os recursos existentes continuam a usar as mesmas funções do servidor:

- Tutor IA: perguntas gerais e contexto de PDFs;
- Resumos de materiais: guardados na tabela `materials`;
- Perguntas de escolha múltipla com validação no servidor;
- Flashcards automáticos a partir dos PDFs, guardados no navegador do utilizador por módulo.

### Configuração obrigatória no alojamento

1. Cria uma chave de projeto em <https://platform.openai.com/api-keys>.
2. Ativa faturação/saldo na **plataforma da API OpenAI**. Ter uma subscrição ChatGPT não inclui necessariamente créditos da API.
3. No **projeto do Lovable → Settings → Secrets / Environment Variables**, adiciona o segredo de **servidor** `OPENAI_API_KEY` com o valor da tua chave.
4. Opcionalmente, define `OPENAI_MODEL` (predefinição: `gpt-5-mini`). Esta variável também deve ser configurada só no servidor.
5. Abre **Tutor IA → Testar ligação IA**. Depois experimenta uma pergunta, um resumo, perguntas de revisão e flashcards a partir de um PDF com texto extraído.

Em desenvolvimento local usa um ficheiro `.env` privado, baseado em `.env.example`. Os ficheiros `.env` são ignorados pelo Git. **Nunca incluas a chave no código, nas mensagens de chat, num commit Git ou numa variável com prefixo `VITE_`.** Não é necessário configurar `LOVABLE_API_KEY` para estas funções.

**Importante:** os segredos configurados nas GitHub Actions **não** chegam automaticamente ao servidor publicado no Lovable. Configura-os no ambiente onde o VetEstudo executa as funções de servidor.

### Custos, privacidade e segurança

- A OpenAI cobra pela utilização da API de acordo com o modelo e os tokens; os custos são separados dos créditos do Lovable. Consulta <https://platform.openai.com/pricing> e define alertas/limites no projeto OpenAI.
- O VetEstudo usa `store: false` nos pedidos à API, não grava chaves no navegador e não regista textos dos PDFs nos logs de IA.
- Os excertos de documentos enviados à OpenAI podem conter informação sensível: não carregues dados clínicos identificáveis sem autorização e sem as salvaguardas adequadas.
- Os pedidos passam por **funções de servidor** do TanStack Start, onde a chave é lida em tempo de execução. O código do navegador não a recebe.
- Existe um **limite básico em memória por instância de servidor** (8 pedidos/minuto e 100/dia por endereço identificado). Este mecanismo **não garante um limite de gastos real** em ambientes com várias instâncias ou reinícios. Antes de disponibilizar o serviço publicamente, ativa autenticação obrigatória, permissões de acesso, limitação distribuída de pedidos (por exemplo na Cloudflare) e limites de despesa na OpenAI.
- PDFs digitalizados sem texto extraível continuam a exigir OCR para utilização nas ferramentas de IA.
- Um pedido à API pode falhar por chave inválida, falta de saldo, limites de pedidos ou modelo indisponível. O Tutor mostra uma mensagem de diagnóstico sem expor dados internos.

Os testes automáticos não efetuam pedidos pagos à API. Uma confirmação real exige configurar o segredo no servidor e executar o teste do Tutor no ambiente publicado.
