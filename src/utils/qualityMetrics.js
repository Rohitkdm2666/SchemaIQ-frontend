export const normalizeProfile = (profile) => {
  const tables = (profile?.tables || []).map((t) => ({
    ...t,
    name: t?.name || t?.table || 'unknown_table',
    row_count: Number(t?.row_count) || 0,
    columns: (t?.columns || []).map((c) => ({
      ...c,
      null_count: Number(c?.null_count) || 0,
      null_percent: Number(c?.null_percent ?? c?.null_pct) || 0,
      distinct_count: c?.distinct_count === null || c?.distinct_count === undefined ? 0 : Number(c?.distinct_count) || 0,
    })),
  }))

  const fk_orphans = (profile?.fk_orphans || []).map((o) => ({
    ...o,
    orphan_count: Number(o?.orphan_count) || 0,
  }))

  return { ...profile, tables, fk_orphans }
}

export const computeQualityMetrics = (rawProfile) => {
  const profileData = normalizeProfile(rawProfile)
  if (!profileData || !profileData.tables || profileData.tables.length === 0) {
    return {
      overall: 0,
      completeness: 0,
      consistency: 0,
      validity: 0,
      fkIntegrity: 0,
      uniqueness: 0,
      dims: [],
      perTable: [],
      issues: [],
      heatmap: [],
    }
  }

  const tables = profileData.tables
  let totalCells = 0
  let totalNulls = 0
  let totalDistinct = 0
  let totalColCount = 0

  const perTableData = tables.map((t) => {
    const rows = t.row_count || 0
    let tNulls = 0
    const colCount = (t.columns || []).length
    ;(t.columns || []).forEach((c) => {
      tNulls += c.null_count || 0
      totalDistinct += c.distinct_count || 0
      totalColCount++
    })
    const tCells = rows * colCount
    totalCells += tCells
    totalNulls += tNulls
    const completeness = tCells > 0 ? ((tCells - tNulls) / tCells) * 100 : 100
    const score = Math.round(completeness * 10) / 10
    return {
      name: t.name,
      score,
      color: score >= 95 ? '#27ae60' : score >= 80 ? '#f39c12' : '#e74c3c',
      rows,
      colCount,
      tNulls,
      tCells,
    }
  })

  const completeness = totalCells > 0 ? ((totalCells - totalNulls) / totalCells) * 100 : 100
  const totalOrphans = (profileData.fk_orphans || []).reduce((s, o) => s + (o.orphan_count || 0), 0)
  const fkChecks = (profileData.fk_orphans || []).length
  const fkIntegrity = totalOrphans === 0 ? 100 : Math.max(0, 100 - totalOrphans)

  const avgDistinct = totalColCount > 0 ? totalDistinct / totalColCount : 0
  const maxRows = Math.max(...tables.map((t) => t.row_count || 1))
  const uniqueness = maxRows > 0 ? Math.min(100, (avgDistinct / maxRows) * 100 * 2.5) : 0

  const nullRates = tables.flatMap((t) => (t.columns || []).map((c) => c.null_percent || 0))
  const avgNull = nullRates.length > 0 ? nullRates.reduce((a, b) => a + b, 0) / nullRates.length : 0
  const variance = nullRates.length > 0 ? nullRates.reduce((s, r) => s + Math.pow(r - avgNull, 2), 0) / nullRates.length : 0
  const consistency = Math.max(0, Math.min(100, 100 - Math.sqrt(variance)))
  const validity = Math.max(0, Math.min(100, completeness * 0.7 + consistency * 0.3))

  const overall = Math.round((completeness * 0.35 + consistency * 0.2 + validity * 0.15 + fkIntegrity * 0.2 + uniqueness * 0.1) * 10) / 10

  const r = (v) => Math.round(v * 10) / 10
  const strokeFor = (v) => (v >= 90 ? '#27ae60' : v >= 70 ? '#f39c12' : '#e74c3c')

  const dims = [
    { label: 'Completeness', pct: r(completeness), stroke: strokeFor(completeness) },
    { label: 'Consistency', pct: r(consistency), stroke: strokeFor(consistency) },
    { label: 'Validity', pct: r(validity), stroke: strokeFor(validity) },
    { label: 'FK Integrity', pct: r(fkIntegrity), stroke: strokeFor(fkIntegrity) },
    { label: 'Uniqueness', pct: r(Math.min(100, uniqueness)), stroke: strokeFor(uniqueness) },
  ]

  const issues = []
  tables.forEach((t) => {
    ;(t.columns || []).forEach((c) => {
      if (c.null_percent > 50) {
        issues.push({ sev: 'err', title: `${t.name}.${c.name} — Critical null rate`, desc: `${c.null_percent.toFixed(1)}% null (${c.null_count.toLocaleString()} of ${t.row_count.toLocaleString()} rows). Consider imputation or marking as optional.` })
      } else if (c.null_percent > 10) {
        issues.push({ sev: 'warn', title: `${t.name}.${c.name} — Elevated null rate`, desc: `${c.null_percent.toFixed(1)}% null (${c.null_count.toLocaleString()} rows). Review if nulls are expected for this field.` })
      }
    })
    ;(t.columns || []).forEach((c) => {
      if (c.distinct_count !== null && c.distinct_count !== undefined && c.distinct_count === 1 && t.row_count > 1) {
        issues.push({ sev: 'warn', title: `${t.name}.${c.name} — Single value column`, desc: `Only 1 distinct value across ${t.row_count.toLocaleString()} rows. Column may be redundant.` })
      }
    })
  })

  ;(profileData.fk_orphans || []).forEach((o) => {
    if (o.orphan_count > 0) {
      issues.push({ sev: 'err', title: `FK Orphan: ${o.from_table}.${o.from_column}`, desc: `${o.orphan_count} orphaned rows referencing ${o.to_table}.${o.to_column}. Referential integrity violated.` })
    }
  })

  perTableData.filter((t) => t.score >= 99.9).forEach((t) => {
    issues.push({ sev: 'ok', title: `${t.name} — Fully complete`, desc: `All ${t.rows.toLocaleString()} rows × ${t.colCount} columns are populated. No null values detected.` })
  })
  if (fkChecks > 0 && totalOrphans === 0) {
    issues.push({ sev: 'ok', title: 'FK Integrity — All checks passed', desc: `0 orphaned rows across ${fkChecks} foreign key relationships. Full referential integrity.` })
  }

  const sevOrder = { err: 0, warn: 1, ok: 2 }
  issues.sort((a, b) => sevOrder[a.sev] - sevOrder[b.sev])

  const fkMap = {}
  ;(profileData.fk_orphans || []).forEach((o) => {
    if (!fkMap[o.from_table]) fkMap[o.from_table] = { checks: 0, orphans: 0 }
    fkMap[o.from_table].checks++
    fkMap[o.from_table].orphans += o.orphan_count || 0
  })

  const heatmap = tables.map((t) => {
    const rows = t.row_count || 0
    const cols = t.columns || []
    const tCells = rows * cols.length
    const tNulls = cols.reduce((s, c) => s + (c.null_count || 0), 0)
    const tCompleteness = tCells > 0 ? r(((tCells - tNulls) / tCells) * 100) : 100

    const tNullRates = cols.map((c) => c.null_percent || 0)
    const tAvgNull = tNullRates.length > 0 ? tNullRates.reduce((a, b) => a + b, 0) / tNullRates.length : 0
    const tVar = tNullRates.length > 0 ? tNullRates.reduce((s, x) => s + Math.pow(x - tAvgNull, 2), 0) / tNullRates.length : 0
    const tConsistency = r(Math.max(0, Math.min(100, 100 - Math.sqrt(tVar))))
    const tValidity = r(Math.max(0, Math.min(100, tCompleteness * 0.7 + tConsistency * 0.3)))

    const tDistinct = cols.reduce((s, c) => s + (c.distinct_count || 0), 0)
    const tUniqueness = rows > 0 && cols.length > 0 ? r(Math.min(100, (tDistinct / cols.length / rows) * 100 * 2.5)) : null
    const fk = fkMap[t.name]
    const tFk = fk ? (fk.orphans === 0 ? 100 : r(Math.max(0, 100 - fk.orphans))) : null

    return [t.name, [tCompleteness, tConsistency, tValidity, tUniqueness, tFk]]
  })

  return {
    overall,
    completeness: r(completeness),
    consistency: r(consistency),
    validity: r(validity),
    fkIntegrity: r(fkIntegrity),
    uniqueness: r(Math.min(100, uniqueness)),
    dims,
    perTable: perTableData,
    issues: issues.slice(0, 12),
    heatmap,
  }
}
