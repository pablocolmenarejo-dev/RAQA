// components/ValidationScreen.tsx
import React, { useMemo, useState } from "react";
import type { MatchOutput, MatchRecord, TopCandidate, MatchTier } from "@/types";

type Props = {
  result: MatchOutput;                 // El MatchOutput completo (matches + top3 + summary)
  onBack?: () => void;                 // Opcional: volver a la pantalla anterior
  onConfirmMatch?: (m: MatchRecord) => void; // Opcional: callback al confirmar un match
};

export default function ValidationScreen({ result, onBack, onConfirmMatch }: Props) {
  const [tierFilter, setTierFilter] = useState<MatchTier | "TODOS">("TODOS");
  const [customerFilter, setCustomerFilter] = useState<string>("TODOS");
  const [index, setIndex] = useState<number>(0);

  // Lista de customers disponibles (para dropdown)
  const customers = useMemo(() => {
    const set = new Set<string>();
    for (const m of result.matches) set.add((m.PRUEBA_customer ?? "").trim() || "(Sin Customer)");
    return ["TODOS", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [result.matches]);

  // Aplicar filtros (tier + customer)
  const filtered = useMemo<MatchRecord[]>(() => {
    let arr = result.matches;
    if (tierFilter !== "TODOS") arr = arr.filter(m => m.TIER === tierFilter);
    if (customerFilter !== "TODOS") {
      arr = arr.filter(m => ((m.PRUEBA_customer ?? "").trim() || "(Sin Customer)") === customerFilter);
    }
    // Ordenar por Customer y SCORE desc (por coherencia con el resto de vistas)
    return [...arr].sort((a, b) => {
      const ca = (a.PRUEBA_customer ?? "").localeCompare(b.PRUEBA_customer ?? "");
      if (ca !== 0) return ca;
      return b.SCORE - a.SCORE;
    });
  }, [result.matches, tierFilter, customerFilter]);

  // Asegurar índice válido si cambian los filtros
  const safeIndex = Math.min(index, Math.max(0, filtered.length - 1));
  const current = filtered[safeIndex];

  // Top-3 candidatos para el registro actual
  const top3 = useMemo<TopCandidate[]>(() => {
    if (!current) return [];
    const list = result.top3.filter(c =>
      c.PRUEBA_nombre === current.PRUEBA_nombre &&
      (c.PRUEBA_cp ?? "") === (current.PRUEBA_cp ?? "") &&
      (c.PRUEBA_num ?? "") === (current.PRUEBA_num ?? "")
    );
    return list.sort((a, b) => a.CAND_RANK - b.CAND_RANK);
  }, [current, result.top3]);

  function handlePrev() {
    setIndex(i => Math.max(0, i - 1));
  }
  function handleNext() {
    setIndex(i => Math.min(filtered.length - 1, i + 1));
  }

  return (
    <div style={{ padding: 16 }}>
      <header style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {onBack && (
          <button onClick={onBack} style={btnSecondary}>← Volver</button>
        )}
        <h2 style={{ margin: 0, flex: 1 }}>Validación de coincidencias</h2>

        {/* Filtros */}
        <div style={{ display: "flex", gap: 8 }}>
          <select value={customerFilter} onChange={e => { setCustomerFilter(e.target.value); setIndex(0); }}>
            {customers.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={tierFilter} onChange={e => { setTierFilter(e.target.value as any); setIndex(0); }}>
            <option value="TODOS">Todos los TIER</option>
            <option value="ALTA">ALTA</option>
            <option value="REVISAR">REVISAR</option>
            <option value="SIN">SIN</option>
          </select>
        </div>
      </header>

      {/* Navegación por registros */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <button onClick={handlePrev} disabled={safeIndex <= 0} style={btnSecondary}>Anterior</button>
        <span style={{ color: "#555" }}>
          {filtered.length ? `Registro ${safeIndex + 1} de ${filtered.length}` : "Sin resultados"}
        </span>
        <button onClick={handleNext} disabled={safeIndex >= filtered.length - 1} style={btnSecondary}>Siguiente</button>
      </div>

      {!current ? (
        <p style={{ color: "#666" }}>Ajusta los filtros para ver coincidencias.</p>
      ) : (
        <>
          {/* PRUEBA (contexto) */}
          <section style={card}>
            <h3 style={{ marginTop: 0 }}>Registro PRUEBA</h3>
            <Grid>
              <Field label="Customer" value={current.PRUEBA_customer ?? ""} />
              <Field label="Nombre" value={current.PRUEBA_nombre} />
              <Field label="Calle" value={current.PRUEBA_street} />
              <Field label="Municipio" value={current.PRUEBA_city} />
              <Field label="CP" value={current.PRUEBA_cp ?? ""} />
              <Field label="Nº vía" value={current.PRUEBA_num ?? ""} />
            </Grid>
          </section>

          {/* Mejor match */}
          <section style={card}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <h3 style={{ marginTop: 0 }}>Mejor coincidencia</h3>
              <span style={tierBadgeStyle(current.TIER)}>{current.TIER}</span>
            </div>
            <Grid>
              <Field label="Nombre oficial" value={current.MIN_nombre ?? ""} />
              <Field label="Vía oficial" value={`${current.MIN_via ?? ""} ${current.MIN_num ?? ""}`.trim()} />
              <Field label="Municipio" value={current.MIN_municipio ?? ""} />
              <Field label="CP" value={current.MIN_cp ?? ""} />
              <Field label="SCORE" value={current.SCORE.toFixed(3)} />
              <Field label="Fuente (Excel)" value={current.MIN_source ?? ""} />
              <Field label="Código centro (C)" value={current.MIN_codigo_centro ?? ""} />
              <Field label="Fecha última autorización (Y)" value={current.MIN_fecha_autoriz ?? ""} />
              <Field label="Oferta asistencial (AC)" value={current.MIN_oferta_asist ?? ""} long />
            </Grid>

            <div style={{ marginTop: 12 }}>
              {onConfirmMatch && (
                <button onClick={() => onConfirmMatch(current)} style={btnPrimary}>
                  Confirmar este match
                </button>
              )}
            </div>
          </section>

          {/* Top-3 candidatos */}
          <section style={card}>
            <h3 style={{ marginTop: 0 }}>Top-3 candidatos</h3>
            {top3.length === 0 ? (
              <p style={{ color: "#666" }}>No hay candidatos alternativos.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={tableStyle}>
                  <thead>
                    <tr>
                      <th style={th}>RANK</th>
                      <th style={th}>SCORE</th>
                      <th style={th}>Nombre oficial</th>
                      <th style={th}>Vía</th>
                      <th style={th}>Nº</th>
                      <th style={th}>Municipio</th>
                      <th style={th}>CP</th>
                      <th style={th}>Fuente</th>
                      <th style={th}>C</th>
                      <th style={th}>Y</th>
                      <th style={th}>AC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {top3.map((c, i) => (
                      <tr key={i}>
                        <td style={td}>{c.CAND_RANK}</td>
                        <td style={td}>{c.CAND_SCORE.toFixed(3)}</td>
                        <td style={td}>{c.CAND_MIN_nombre ?? ""}</td>
                        <td style={td}>{c.CAND_MIN_via ?? ""}</td>
                        <td style={td}>{c.CAND_MIN_num ?? ""}</td>
                        <td style={td}>{c.CAND_MIN_mun ?? ""}</td>
                        <td style={td}>{c.CAND_MIN_cp ?? ""}</td>
                        <td style={td}>{c.CAND_MIN_source ?? ""}</td>
                        <td style={td}>{c.CAND_MIN_codigo_centro ?? ""}</td>
                        <td style={td}>{c.CAND_MIN_fecha_autoriz ?? ""}</td>
                        <td style={td}>{c.CAND_MIN_oferta_asist ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

/* ====================== Componentes de apoyo (UI) ====================== */

function Field({ label, value, long }: { label: string; value: string | number; long?: boolean }) {
  return (
    <div style={{ minWidth: 220, gridColumn: long ? "1 / -1" as any : "auto" }}>
      <div style={{ fontSize: 12, color: "#666" }}>{label}</div>
      <div style={{ fontWeight: 600 }}>{value || "-"}</div>
    </div>
  );
}

const Grid: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
      gap: 10,
    }}
  >
    {children}
  </div>
);

const card: React.CSSProperties = {
  border: "1px solid #e5e5e5",
  borderRadius: 8,
  padding: 12,
  marginBottom: 12,
  background: "#fafafa",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const th: React.CSSProperties = {
  textAlign: "left",
  borderBottom: "2px solid #ddd",
  padding: "8px 6px",
  background: "#f7f7f7",
  position: "sticky",
  top: 0,
  zIndex: 1,
};

const td: React.CSSProperties = {
  borderBottom: "1px solid #eee",
  padding: "6px",
  verticalAlign: "top",
};

const btnPrimary: React.CSSProperties = {
  background: "#0f9d58",
  color: "#fff",
  border: "1px solid #0c6",
  padding: "8px 12px",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 700,
};

const btnSecondary: React.CSSProperties = {
  background: "#f2f2f2",
  color: "#222",
  border: "1px solid #ddd",
  padding: "6px 10px",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
};

function tierBadgeStyle(tier: MatchRecord["TIER"]): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-block",
    padding: "2px 8px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 700,
  };
  if (tier === "ALTA") return { ...base, background: "#e8f5e9", color: "#2e7d32", border: "1px solid #c8e6c9" };
  if (tier === "REVISAR") return { ...base, background: "#fff8e1", color: "#f57f17", border: "1px solid #ffe082" };
  return { ...base, background: "#ffebee", color: "#c62828", border: "1px solid #ffcdd2" };
}
