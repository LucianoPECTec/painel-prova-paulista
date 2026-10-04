# Jornada da Prova Paulista — Painel da URE

Painel estático (sem servidor) publicado no GitHub Pages.

```
prova-paulista/
├── index.html        ← página principal (painel)
├── css/estilo.css    ← cores e aparência
├── js/
│   ├── config.js     ← meta padrão e dados do envio
│   ├── dados.js      ← dados das escolas (atualize a cada prova)
│   └── app.js        ← lógica do painel
└── paginas/          ← páginas extras (evolução, calculadoras)
```

## Publicar no GitHub Pages
1. Envie todos os arquivos para um repositório.
2. Settings → Pages → Source: *Deploy from a branch* → `main` / `(root)`.
3. Aguarde 1–2 minutos e abra o link gerado.
