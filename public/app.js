// Global State
let notes = [];
let activeNote = null;
let originalTitle = '';
let saveTimeout = null;
let searchTimeout = null;

// Initialize Lucide Icons helper
function initIcons() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initIcons();

  // Load initial notes
  loadNotes();

  // Event Listeners: New Note
  document.getElementById('new-note-btn').addEventListener('click', createNewNote);
  document.getElementById('empty-new-note-btn').addEventListener('click', createNewNote);

  // Event Listeners: Edit/Preview Tabs Toggle
  const tabs = document.querySelectorAll('.editor-tabs .tab-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.workspace-editor .tab-content').forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      const targetTab = tab.getAttribute('data-tab');
      document.getElementById(`tab-${targetTab}`).classList.add('active');

      if (targetTab === 'preview') {
        renderPreview();
      }
    });
  });

  // Event Listeners: Auto-Save on inputs
  const textarea = document.getElementById('editor-textarea');
  const titleInput = document.getElementById('note-title-input');

  textarea.addEventListener('input', triggerAutoSave);
  titleInput.addEventListener('input', triggerAutoSave);

  // Event Listeners: Delete Note
  document.getElementById('delete-note-btn').addEventListener('click', deleteActiveNote);

  // Event Listeners: Search
  const searchInput = document.getElementById('search-input');
  searchInput.addEventListener('input', () => {
    const query = searchInput.value;
    const clearBtn = document.getElementById('clear-search-btn');
    clearBtn.style.display = query ? 'flex' : 'none';

    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      performSearch(query);
    }, 3000); // 300ms debounce
  });

  // Clear Search Button
  document.getElementById('clear-search-btn').addEventListener('click', () => {
    searchInput.value = '';
    document.getElementById('clear-search-btn').style.display = 'none';
    loadNotes();
  });
});

// Fetch all notes from API
async function loadNotes(selectFirst = false) {
  try {
    const res = await fetch('/api/notes');
    if (!res.ok) throw new Error('Falha ao buscar notas.');
    notes = await res.json();
    renderNotesList();

    if (selectFirst && notes.length > 0) {
      selectNote(notes[0].title);
    }
  } catch (error) {
    console.error(error);
  }
}

// Render list of notes on sidebar
function renderNotesList() {
  const list = document.getElementById('notes-list');
  list.innerHTML = '';

  if (notes.length === 0) {
    list.innerHTML = '<div class="loading-placeholder">Nenhuma nota criada ainda.</div>';
    return;
  }

  notes.forEach(note => {
    const item = document.createElement('div');
    item.className = `note-item ${activeNote && activeNote.title === note.title ? 'active' : ''}`;
    item.addEventListener('click', () => selectNote(note.title));

    const date = new Date(note.updatedAt).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    item.innerHTML = `
      <div class="note-item-title">${escapeHtml(note.title)}</div>
      <div class="note-item-date">${date}</div>
    `;

    list.appendChild(item);
  });
}

// Select note to edit
async function selectNote(title) {
  try {
    // Save any pending changes first
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      await saveNoteImmediate();
    }

    const res = await fetch(`/api/notes/${encodeURIComponent(title)}`);
    if (!res.ok) throw new Error('Falha ao abrir nota.');
    activeNote = await res.json();
    originalTitle = activeNote.title;

    // Show workspace, hide empty state
    document.getElementById('empty-workspace').style.display = 'none';
    document.getElementById('active-workspace').style.display = 'flex';

    // Populate values
    document.getElementById('note-title-input').value = activeNote.title;
    document.getElementById('editor-textarea').value = activeNote.content;

    // Reset tab to Editor
    const editTabBtn = document.querySelector('.editor-tabs .tab-btn[data-tab="edit"]');
    if (editTabBtn) editTabBtn.click();

    updateSaveStatus('salvo');
    renderNotesList();
  } catch (error) {
    console.error(error);
    alert('Erro ao carregar nota.');
  }
}

// Render markdown preview
function renderPreview() {
  const content = document.getElementById('editor-textarea').value;
  const preview = document.getElementById('markdown-preview');

  if (window.marked) {
    preview.innerHTML = window.marked.parse(content);
  } else {
    preview.innerHTML = '<p>Erro: compilador de markdown (marked.js) não foi carregado.</p>';
  }
}

// Create new empty note
function createNewNote() {
  // Generate unique default name
  let count = 1;
  let defaultTitle = 'Nota sem titulo';
  while (notes.some(n => n.title === defaultTitle)) {
    count++;
    defaultTitle = `Nota sem titulo (${count})`;
  }

  activeNote = {
    title: defaultTitle,
    content: ''
  };
  originalTitle = ''; // Indicates it is brand new

  // Show UI
  document.getElementById('empty-workspace').style.display = 'none';
  document.getElementById('active-workspace').style.display = 'flex';

  document.getElementById('note-title-input').value = activeNote.title;
  document.getElementById('editor-textarea').value = activeNote.content;

  // Focus title for typing
  document.getElementById('note-title-input').focus();
  document.getElementById('note-title-input').select();

  updateSaveStatus('pendente');
  // Immediately write the empty file to disk to register it
  saveNoteImmediate();
}

// Debounced auto-save
function triggerAutoSave() {
  updateSaveStatus('salvando');
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveNoteImmediate();
  }, 1000); // Save after 1 second of inactivity
}

// Save note immediately to API
async function saveNoteImmediate() {
  if (!activeNote) return;

  const currentTitle = document.getElementById('note-title-input').value.trim();
  const currentContent = document.getElementById('editor-textarea').value;

  if (!currentTitle) {
    updateSaveStatus('erro');
    return;
  }

  try {
    // If the title changed, we need to delete the old file to perform a rename
    if (originalTitle && originalTitle !== currentTitle) {
      await fetch(`/api/notes/${encodeURIComponent(originalTitle)}`, {
        method: 'DELETE'
      });
    }

    const res = await fetch(`/api/notes/${encodeURIComponent(currentTitle)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: currentContent })
    });

    if (!res.ok) throw new Error('Falha ao salvar nota.');
    
    const result = await res.json();
    activeNote.title = result.title;
    activeNote.content = currentContent;
    originalTitle = result.title;

    updateSaveStatus('salvo');
    loadNotes();
  } catch (error) {
    console.error(error);
    updateSaveStatus('erro');
  }
}

// Delete current active note
async function deleteActiveNote() {
  if (!activeNote) return;

  if (!confirm(`Deseja mesmo excluir a nota "${activeNote.title}"?`)) {
    return;
  }

  try {
    clearTimeout(saveTimeout);
    const res = await fetch(`/api/notes/${encodeURIComponent(activeNote.title)}`, {
      method: 'DELETE'
    });

    if (!res.ok) throw new Error('Erro ao excluir nota.');

    activeNote = null;
    originalTitle = '';
    
    document.getElementById('active-workspace').style.display = 'none';
    document.getElementById('empty-workspace').style.display = 'flex';

    loadNotes();
  } catch (error) {
    console.error(error);
    alert('Erro ao excluir a nota.');
  }
}

// Search Notes via Server API
async function performSearch(query) {
  if (!query.trim()) {
    loadNotes();
    return;
  }

  try {
    const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error('Erro na busca.');
    const results = await res.json();

    // Map search results back to notes list structure or display them
    const list = document.getElementById('notes-list');
    list.innerHTML = '';

    if (results.length === 0) {
      list.innerHTML = '<div class="empty-search">Nenhum resultado encontrado.</div>';
      return;
    }

    results.forEach(result => {
      const item = document.createElement('div');
      item.className = `note-item ${activeNote && activeNote.title === result.title ? 'active' : ''}`;
      item.addEventListener('click', () => selectNote(result.title));

      item.innerHTML = `
        <div class="note-item-title">${escapeHtml(result.title)}</div>
        <div class="note-item-snippet">${escapeHtml(result.snippet)}</div>
      `;

      list.appendChild(item);
    });
  } catch (error) {
    console.error(error);
  }
}

// Helper: Save status label updater
function updateSaveStatus(status) {
  const statusEl = document.getElementById('save-status');
  if (status === 'salvo') {
    statusEl.className = 'save-status';
    statusEl.innerHTML = `<i data-lucide="check"></i> Salvo localmente`;
  } else if (status === 'salvando') {
    statusEl.className = 'save-status saving';
    statusEl.innerHTML = `<i data-lucide="loader" class="icon-spin"></i> Salvando automaticamente...`;
  } else if (status === 'erro') {
    statusEl.className = 'save-status';
    statusEl.style.color = 'var(--color-danger)';
    statusEl.innerHTML = `<i data-lucide="alert-triangle"></i> Erro ao salvar!`;
  } else if (status === 'pendente') {
    statusEl.className = 'save-status saving';
    statusEl.innerHTML = `<i data-lucide="save"></i> Aguardando alteracoes...`;
  }
  initIcons();
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
