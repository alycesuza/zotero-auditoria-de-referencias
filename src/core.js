"use strict";
var Core = (() => {
  const norm = value => String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  const doi = value => String(value || "").trim().replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, "").replace(/^doi:\s*/i, "").toLowerCase();
  function validDOI(value) {return /^10\.\d{4,9}\/\S+$/i.test(doi(value));}
  function isbn(value) {
    const s = String(value || "").replace(/[^0-9X]/gi, "").toUpperCase();
    if (s.length === 13) return [...s].reduce((sum, n, i) => sum + Number(n) * (i % 2 ? 3 : 1), 0) % 10 === 0;
    if (s.length === 10 && /^\d{9}[\dX]$/.test(s)) return [...s].reduce((sum, n, i) => sum + (n === "X" ? 10 : Number(n)) * (10 - i), 0) % 11 === 0;
    return false;
  }
  function storedCodes(item) {
    return [...new Set((item.attachments || []).filter(a => !a.deleted && ["imported_file", "imported_url", "embedded_image"].includes(a.linkMode)).map(a => a.key))].sort().join(", ");
  }
  function context(text, index) {return text.slice(Math.max(0, index - 100), Math.min(text.length, index + 220)).replace(/\s+/g, " ").trim();}
  function csv(rows) {
    if (!rows.length) return "";
    const headers = [...new Set(rows.flatMap(row => Object.keys(row)))];
    const escape = value => {
      let s = typeof value === "object" && value !== null ? JSON.stringify(value) : String(value ?? "");
      if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
      return '"' + s.replace(/"/g, '""') + '"';
    };
    return "\uFEFF" + [headers, ...rows.map(row => headers.map(key => row[key]))].map(row => row.map(escape).join(";")).join("\r\n");
  }
  function tags(item, prefix) {return (item.tags || []).filter(t => norm(t).startsWith(norm(prefix))).map(t => t.slice(t.indexOf(":") + 1).trim()).filter(Boolean);}
  const issue = (item, severity, field, message) => ({key:item.key, title:item.title, severity, field, message});
    function audit(items) {
    const result = [], identifiers = new Map();
    for (const item of items) {
      if (!item.title?.trim()) result.push(issue(item, "Alta", "title", "Título ausente."));
      if (!item.creators?.length) result.push(issue(item, "Revisar", "creators", "Autoria ou instituição não informada."));
      if (!item.date && !["webpage", "document", "note"].includes(item.type)) result.push(issue(item, "Revisar", "date", "Data não informada. Verifique o tipo documental antes de preencher."));
      if (item.DOI) {
        const id = doi(item.DOI);
        if (!validDOI(id)) result.push(issue(item, "Alta", "DOI", "Formato de DOI inválido. A sintaxe válida não comprova identidade da obra."));
        else {const group=identifiers.get(id)||[];group.push(item);identifiers.set(id,group);}
      }
      if (item.ISBN) {
        const matches = String(item.ISBN).match(/(?:97[89][-\s]?)?\d[-\d\s]{7,20}[\dX]/gi) || [item.ISBN];
        if (!matches.some(isbn)) result.push(issue(item, "Alta", "ISBN", "ISBN sem dígito verificador válido."));
      }
      if (/\b(?:19|20)\d{2}\s*[-–]\s*(?:19|20)\d{2}\b/.test(item.date || "")) result.push(issue(item, "Revisar", "date", "O campo de data contém um período. Confira se é cobertura temporal ou data de publicação."));
      if (/\b(?:livro|book|edited by|organizad[oa]r)/i.test(item.title || "") && item.type === "journalArticle") result.push(issue(item, "Revisar", "itemType", "Há sinal de livro no título de item cadastrado como artigo. Conferência manual necessária."));
    }
    for (const [id, group] of identifiers) if (group.length > 1) for (const item of group) result.push(issue(item,"Revisar","DOI",`DOI compartilhado com ${group.filter(x=>x.key!==item.key).map(x=>x.key).join(", ")}: ${id}. Confira versões antes de fundir.`));
    return result;
  }
  const PluginCore={audit};

  return {norm, doi, validDOI, isbn, storedCodes, csv, tags, ...PluginCore};
})();
if (typeof module !== "undefined") module.exports = Core;
