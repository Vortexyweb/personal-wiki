const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const NOTES_DIR = path.join(__dirname, 'notes');

// Ensure notes directory exists
if (!fs.existsSync(NOTES_DIR)) {
  fs.mkdirSync(NOTES_DIR);
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper: Get clean note title from filename
const getNoteName = (filename) => filename.replace(/\.md$/, '');

// API: List all notes
app.get('/api/notes', (req, res) => {
  try {
    const files = fs.readdirSync(NOTES_DIR);
    const notes = files
      .filter(file => file.endsWith('.md'))
      .map(file => {
        const filePath = path.join(NOTES_DIR, file);
        const stats = fs.statSync(filePath);
        return {
          title: getNoteName(file),
          filename: file,
          updatedAt: stats.mtime,
          createdAt: stats.birthtime,
          size: stats.size
        };
      })
      .sort((a, b) => b.updatedAt - a.updatedAt); // Order by last modified

    res.json(notes);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar notas: ' + error.message });
  }
});

// API: Get single note content
app.get('/api/notes/:name', (req, res) => {
  try {
    const noteName = req.params.name;
    const filePath = path.join(NOTES_DIR, `${noteName}.md`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Nota nao encontrada.' });
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const stats = fs.statSync(filePath);

    res.json({
      title: noteName,
      content: content,
      updatedAt: stats.mtime
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao ler nota: ' + error.message });
  }
});

// API: Create or update note
app.post('/api/notes/:name', (req, res) => {
  try {
    const noteName = req.params.name.trim();
    // Validate filename safety
    if (!noteName || /[\/\\:\*\?"<>\|]/.test(noteName)) {
      return res.status(400).json({ error: 'Nome de nota invalido.' });
    }

    const { content } = req.body;
    const filePath = path.join(NOTES_DIR, `${noteName}.md`);

    fs.writeFileSync(filePath, content || '', 'utf8');
    const stats = fs.statSync(filePath);

    res.json({
      title: noteName,
      updatedAt: stats.mtime,
      message: 'Nota salva com sucesso!'
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao salvar nota: ' + error.message });
  }
});

// API: Delete note
app.delete('/api/notes/:name', (req, res) => {
  try {
    const noteName = req.params.name;
    const filePath = path.join(NOTES_DIR, `${noteName}.md`);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Nota nao encontrada.' });
    }

    fs.unlinkSync(filePath);
    res.json({ message: 'Nota excluida com sucesso!' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir nota: ' + error.message });
  }
});

// API: Search notes
app.get('/api/search', (req, res) => {
  try {
    const query = (req.query.q || '').toLowerCase().trim();
    if (!query) {
      return res.json([]);
    }

    const files = fs.readdirSync(NOTES_DIR);
    const results = [];

    files
      .filter(file => file.endsWith('.md'))
      .forEach(file => {
        const filePath = path.join(NOTES_DIR, file);
        const content = fs.readFileSync(filePath, 'utf8');
        const title = getNoteName(file);

        const titleMatch = title.toLowerCase().includes(query);
        const contentMatch = content.toLowerCase().includes(query);

        if (titleMatch || contentMatch) {
          // Calculate snippet of text containing the match
          let snippet = '';
          if (contentMatch) {
            const index = content.toLowerCase().indexOf(query);
            const start = Math.max(0, index - 40);
            const end = Math.min(content.length, index + query.length + 40);
            snippet = (start > 0 ? '...' : '') + content.substring(start, end).replace(/\n/g, ' ') + (end < content.length ? '...' : '');
          } else {
            snippet = content.substring(0, 80).replace(/\n/g, ' ') + (content.length > 80 ? '...' : '');
          }

          results.push({
            title: title,
            snippet: snippet,
            score: titleMatch ? 2 : 1 // Prioritize title matches
          });
        }
      });

    results.sort((a, b) => b.score - a.score);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: 'Erro na busca: ' + error.message });
  }
});

app.listen(PORT, () => {
  console.log(`[Wiki] Servidor rodando em http://localhost:${PORT}`);
});
