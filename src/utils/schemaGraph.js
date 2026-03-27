const DEFAULT_NODE_COLORS = [
  '#c0392b',
  '#2980b9',
  '#27ae60',
  '#f39c12',
  '#8e44ad',
  '#e74c3c',
  '#16a085',
  '#d35400',
  '#2c3e50',
  '#7f8c8d',
]

const CARDINALITY_LABELS = {
  'one-to-one': '1:1',
  'one-to-many': '1:N',
  'many-to-one': 'N:1',
  'many-to-many': 'N:N',
}

function getCardinalityLabel(type) {
  return CARDINALITY_LABELS[type] || type || 'N:1'
}

function hashString(value) {
  let hash = 0

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index)
    hash |= 0
  }

  return Math.abs(hash)
}

function getNodeColor(tableName, palette = DEFAULT_NODE_COLORS) {
  return palette[hashString(tableName) % palette.length]
}

function formatField(table, column) {
  const isPrimaryKey = table.primary_key.includes(column.name)
  const foreignKey = table.foreign_keys.find((fk) => fk.column === column.name)

  if (isPrimaryKey) {
    return `${column.name} (PK)`
  }

  if (foreignKey) {
    return `${column.name} (FK)`
  }

  return column.name
}

function buildForeignKeyIndex(tables) {
  const index = new Map()

  tables.forEach((table) => {
    table.foreign_keys.forEach((fk) => {
      const key = `${table.name}->${fk.references.table}`

      if (!index.has(key)) {
        index.set(key, [])
      }

      index.get(key).push(fk)
    })
  })

  return index
}

function buildNodes(tables, tableStats, palette) {
  return tables.map((table) => {
    const stats = tableStats[table.name] || {}

    return {
      id: table.name,
      label: table.name,
      color: stats.color || getNodeColor(table.name, palette),
      cols: table.columns.length,
      rows: stats.rows ?? null,
      pk: table.primary_key[0] || null,
      fields: table.columns.map((column) => formatField(table, column)),
      columns: table.columns,
      primaryKey: table.primary_key,
      foreignKeys: table.foreign_keys,
    }
  })
}

function buildEdgesFromRelationships(relationships, fkIndex) {
  return relationships.map((relationship, index) => {
    const fkMatches = fkIndex.get(`${relationship.from_table}->${relationship.to_table}`) || []
    const foreignKey = fkMatches[0]

    return {
      id: `${relationship.from_table}-${relationship.to_table}-${index}`,
      source: relationship.from_table,
      target: relationship.to_table,
      type: relationship.type,
      card: getCardinalityLabel(relationship.type),
      via: foreignKey?.column || null,
      fromColumn: foreignKey?.column || null,
      toColumn: foreignKey?.references.column || null,
    }
  })
}

function buildEdgesFromForeignKeys(tables) {
  return tables.flatMap((table) =>
    table.foreign_keys.map((fk, index) => ({
      id: `${table.name}-${fk.references.table}-${fk.column}-${index}`,
      source: table.name,
      target: fk.references.table,
      type: 'many-to-one',
      card: getCardinalityLabel('many-to-one'),
      via: fk.column,
      fromColumn: fk.column,
      toColumn: fk.references.column,
    })),
  )
}

export function buildSchemaGraph(schema, options = {}) {
  const tables = schema?.tables || []
  const relationships = schema?.relationships || []
  const tableStats = options.tableStats || {}
  const palette = options.palette || DEFAULT_NODE_COLORS
  const foreignKeyIndex = buildForeignKeyIndex(tables)

  const nodes = buildNodes(tables, tableStats, palette)
  const edges = relationships.length
    ? buildEdgesFromRelationships(relationships, foreignKeyIndex)
    : buildEdgesFromForeignKeys(tables)

  return {
    nodes,
    edges,
  }
}

export { DEFAULT_NODE_COLORS, CARDINALITY_LABELS }
