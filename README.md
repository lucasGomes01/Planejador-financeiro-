# Financial Planner (Planejador Financeiro)

App de planejamento financeiro pessoal que roda **na web** e no **Android (APK)** a partir do mesmo código
(Expo + React Native + Expo Router), com backend **Supabase** (Postgres + autenticação).

## Funcionalidades

- **Lançamentos**: ganhos e custos **fixos mensais** (previsão de salário, aluguel…) e **pontuais**
  (freela, compra única…), com navegação por mês e resumo de ganhos, custos e sobra.
- **Patrimônio**: cadastre onde o dinheiro está — Conta/Caixa, Renda fixa, Ações e Outros —
  com instituição e **% do CDI** (ex.: 105%). Atualize o saldo a qualquer momento; o histórico é guardado.
- **Gráfico do valor guardado** com tudo somado e **chips para escolher o que somar** (por tipo ou por local),
  períodos de 6 meses / 1 ano / 2 anos e projeção de 12 meses (rendimento pelo CDI + sobra mensal prevista).
- **Metas (ex.: Carro)**: vincule os locais onde está o dinheiro do carro, veja o progresso, rendimento
  estimado de cada local (% CDI), previsão de quando atinge a meta e quanto aportar por mês para chegar na data.
- **Cadastro rápido**: botão **+** em todas as telas para lançar ganho/custo, atualizar saldo ou criar um novo local.

## Segurança

- **Row Level Security** em todas as tabelas: cada usuário só lê/escreve as próprias linhas
  (`user_id = auth.uid()`), com `FORCE RLS` e sem permissões para o papel `anon`.
- Chaves estrangeiras compostas impedem vincular saldos/metas a registros de outro usuário.
- **Verificação em duas etapas (TOTP)** opcional; quando ativada, o banco **exige sessão aal2**
  (política restritiva) — sem o código, nenhum dado é acessível, mesmo via API.
- Senha forte obrigatória (10+ caracteres, maiúscula, minúscula, número e símbolo) e mensagens de login genéricas.
- Android: sessão guardada no **Keystore** (expo-secure-store), backup do app desativado,
  bloqueio opcional por **digital/rosto** ao voltar ao app.
- Web: fluxo **PKCE**, logout automático após 15 min sem uso e cabeçalhos de segurança (CSP rígida, HSTS,
  X-Frame-Options etc.) em `public/_headers` (Netlify/Cloudflare Pages) e `vercel.json` (Vercel).
- Validação dos dados no app **e** no banco (`check constraints`).

## Configuração

### 1. Supabase

1. Crie um projeto em <https://supabase.com>.
2. Em **SQL Editor**, rode, em ordem, `supabase/migrations/0001_init.sql` e `0002_mfa_check_function.sql`
   (ou `supabase db push` com a CLI).
3. Em **Authentication → Providers → Email**: mantenha **Confirm email** ligado.
4. Em **Authentication → Policies/Settings** (recomendado):
   - Minimum password length: 10, exigindo letras, dígitos e símbolos;
   - **Leaked password protection** ligado;
   - **MFA → TOTP** habilitado.
5. Em **Authentication → URL Configuration**, adicione a URL do site web e `financialplanner://` em *Redirect URLs*.

### 2. Variáveis de ambiente

```bash
cp .env.example .env
# preencha EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY
```

A chave `anon` é pública por design; quem protege os dados são as políticas RLS. **Nunca** coloque a
`service_role` key no app.

### 3. Rodar

```bash
npm install
npm run web        # navegador
npm start          # Expo (QR code para Android)
npm run typecheck
```

## Gerar o APK (Android)

```bash
npx eas-cli@latest login
npx eas-cli@latest init                       # vincula o projeto à sua conta Expo
npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value https://...
npx eas-cli@latest env:create --environment preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value ...
npm run build:apk                              # perfil "preview" → gera .apk
```

O link para baixar o APK aparece no final do build. Para a Play Store use o perfil `production` (gera .aab).

## Publicar na web

```bash
npm run web:build   # gera a pasta dist/
```

Faça o deploy de `dist/` em Vercel, Netlify ou Cloudflare Pages (os cabeçalhos de segurança já estão configurados).
Se o seu Supabase usar domínio próprio, ajuste `connect-src` da CSP em `public/_headers` e `vercel.json`.

## Estrutura

```
src/app/            telas (Expo Router)
  (auth)/           login e cadastro
  (app)/            abas: Painel, Lançamentos, Patrimônio, Metas, Ajustes
  add.tsx           cadastro rápido (+)
  goal/ investment/ transaction/  detalhes e edição
  mfa.tsx security.tsx            2FA e senha
src/components/     UI, gráfico (SVG), formulários
src/context/        autenticação e dados
src/lib/            Supabase, cálculos financeiros, formatação
supabase/migrations esquema do banco + RLS
```
