const fs = require('fs');
const path = require('path');

class PJEAssuntoClient {
  constructor() {
    this.filePath = path.join(__dirname, '..', 'data', 'pje_assuntos_parsed.json');
    this.map = new Map();
    this.loadedAt = 0;
    this.ttlMs = 24 * 60 * 60 * 1000; // 24h
    this.initialized = false;
  }

  async init(force = false) {
    const now = Date.now();
    if (this.initialized && !force && (now - this.loadedAt) < this.ttlMs) return;
    try {
      if (!fs.existsSync(this.filePath)) {
        console.warn('[PJE-ASSUNTO] Arquivo não encontrado:', this.filePath);
        this.map = new Map();
        this.initialized = true;
        this.loadedAt = Date.now();
        return;
      }
      const raw = fs.readFileSync(this.filePath, 'utf8');
      const arr = JSON.parse(raw);
      const m = new Map();
      if (Array.isArray(arr)) {
        arr.forEach(item => {
          const codigo = item.cod_item !== undefined ? String(item.cod_item) : '';
          let descricao = item.nome;
          if (!descricao || descricao === 'undefined') {
            descricao = item.descricao_glossario || '';
          }
          if (!descricao || descricao === 'undefined') {
            descricao = `Descrição não encontrada (código ${codigo})`;
          }
          if (codigo) m.set(codigo, descricao);
        });
      }
      this.map = m;
      this.loadedAt = Date.now();
      this.initialized = true;
      console.log('[PJE-ASSUNTO] Carregado mapeamento de assuntos:', this.map.size);
    } catch (err) {
      console.error('[PJE-ASSUNTO] Erro ao inicializar mapeamento:', err.message);
    }
  }

  async refresh() {
    await this.init(true);
  }

  async getDescricao(codigo) {
    await this.init();
    if (codigo === undefined || codigo === null) return '';
    const key = String(codigo);
    const descricao = this.map.get(key);
    if (descricao && descricao !== 'undefined') {
      return descricao;
    }
    return `Descrição não encontrada (código ${key})`;
  }

  async enriquecerLista(codigos = []) {
    await this.init();
    return codigos.map(codigo => ({
      codigo: String(codigo),
      descricao: this.map.get(String(codigo)) || `Descrição não encontrada (código ${codigo})`
    }));
  }
}

module.exports = new PJEAssuntoClient();