export const markerColors = ['#c0392b', '#2980b9', '#27ae60', '#f39c12', '#9b59b6', '#e74c3c', '#8e44ad', '#d35400'];

export function schemaToGraph(schemaData) {
  if (!schemaData || !schemaData.tables) {
    return { nodes: [], links: [] };
  }

  const nodes = schemaData.tables.map((table, index) => {
    const isPK = (colName) => table.primary_key && table.primary_key.includes(colName);
    const isFK = (colName) => table.foreign_keys && table.foreign_keys.some(fk => fk.column === colName);

    const fields = table.columns.map(col => {
      let suffix = '';
      if (isPK(col.name)) suffix = ' (PK)';
      else if (isFK(col.name)) suffix = ' (FK)';
      return `${col.name}${suffix}`;
    });

    return {
      id: table.name,
      label: table.name,
      color: markerColors[index % markerColors.length],
      cols: table.columns.length,
      rows: 'N/A', // Placeholder since profile isn't required MVP
      pk: table.primary_key ? table.primary_key.join(', ') : null,
      fields: fields,
      columns: table.columns,
      primaryKey: table.primary_key || [],
      foreignKeys: table.foreign_keys || []
    };
  });

  const links = (schemaData.relationships || []).map((rel, index) => {
    let viaCol = 'unknown';
    const sourceTable = schemaData.tables.find(t => t.name === rel.from_table);
    if (sourceTable && sourceTable.foreign_keys) {
      const fk = sourceTable.foreign_keys.find(f => f.references && f.references.table === rel.to_table);
      if (fk) {
        viaCol = fk.column;
      }
    }

    let card = 'N:1';
    if (rel.type === 'one-to-many') card = '1:N';
    else if (rel.type === 'one-to-one') card = '1:1';
    else if (rel.type === 'many-to-many') card = 'N:M';

    return {
      id: `${rel.from_table}-${rel.to_table}-${index}`,
      source: rel.from_table,
      target: rel.to_table,
      type: rel.type || 'many-to-one',
      card: card,
      via: viaCol,
      fromColumn: viaCol,
      toColumn: viaCol
    };
  });

  return { nodes, links };
}
