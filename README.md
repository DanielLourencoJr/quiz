# ⚗️ Quiz Interativo — Projeto Completo

App de quiz mobile-first feito com **React + Vite**. Funciona como PWA no celular.

---

## 🚀 Como rodar

### Pré-requisitos
- [Node.js 18+](https://nodejs.org/)
- npm (já vem com o Node)

### Passos

```bash
# 1. Entre na pasta do projeto
cd quiz-project

# 2. Instale as dependências
npm install

# 3. Rode em modo desenvolvimento
npm run dev
```

Abra **http://localhost:5173** no navegador (ou no celular da mesma rede).

### Build para produção
```bash
npm run build
npm run preview
```

---

## 🗂 Estrutura do projeto

```
quiz-project/
├── public/
│   └── favicon.svg
├── src/
│   ├── components/
│   │   ├── BottomNav.jsx      # Navegação inferior (mobile)
│   │   ├── QuestionForm.jsx   # Formulário de add/editar questão
│   │   └── Toast.jsx          # Notificações
│   ├── contexts/
│   │   ├── AuthContext.jsx    # Login admin (sessionStorage)
│   │   ├── QuizContext.jsx    # Questões (localStorage)
│   ├── data/
│   │   └── defaultQuestions.js  # 10 questões de exemplo
│   ├── pages/
│   │   ├── Home.jsx           # Tela inicial
│   │   ├── QuizPage.jsx       # Motor do quiz
│   │   ├── Results.jsx        # Resultado final
│   │   ├── AdminLogin.jsx     # Login admin
│   │   ├── AdminPanel.jsx     # Painel CRUD
│   │   ├── AddQuestion.jsx    # Adicionar questão
│   │   └── EditQuestion.jsx   # Editar questão
│   ├── App.jsx                # Rotas
│   ├── main.jsx               # Entrada
│   └── index.css              # Design system mobile-first
├── index.html
├── vite.config.js
└── package.json
```

---

## 🔐 Área Admin

| Campo         | Valor padrão |
|---------------|-------------|
| Rota          | `/admin`    |
| Senha padrão  | `admin123`  |

> **Troque a senha** logo após o primeiro acesso pelo botão 🔑 no painel admin.

A senha fica salva no `localStorage` do navegador. Para deploy em produção, substitua por uma autenticação real (ex: Supabase, Firebase Auth).

---

## ✏️ Tipos de questão suportados

| Tipo             | Código  | Descrição |
|------------------|---------|-----------|
| Múltipla Escolha | `mc`    | 2–6 alternativas, uma correta |
| Verdadeiro/Falso | `tf`    | Duas opções, com explicação |
| Dissertativa     | `essay` | Campo livre + dicas + gabarito |

---

## 📱 Otimizações mobile

- Layout máximo 480px centralizado
- Bottom navigation fixa com safe-area iOS
- Botões com 52px de altura mínima (toque confortável)
- `user-scalable=no` para evitar zoom acidental
- Viewport color / PWA-ready meta tags
- Scroll suave, sem highlight azul no toque

---

## 💾 Persistência de dados

- **Questões** → `localStorage` (sobrevivem ao fechar o navegador)
- **Sessão admin** → `sessionStorage` (expira ao fechar a aba)
- **Senha admin** → `localStorage`

Para usar um banco de dados real, substitua as funções em `src/contexts/QuizContext.jsx`.

---

## 🎨 Design system

Todas as variáveis de cor e espaçamento estão em `src/index.css`:

```css
--blue, --purple, --green, --red, --orange  /* cores de destaque */
--bg, --bg2, --bg3, --card                  /* fundos em camadas */
--text, --text2, --text3                    /* hierarquia de texto */
--radius, --radius-sm, --radius-lg          /* bordas */
```

---

## 🌐 Deploy gratuito

**Vercel** (recomendado):
```bash
npm install -g vercel
vercel
```

**Netlify**:
```bash
npm run build
# Faça upload da pasta dist/ no netlify.com
```
