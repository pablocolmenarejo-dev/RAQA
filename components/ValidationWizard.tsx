import React from "react";

export type ValidationKind = "ALTA" | "REVISAR" | "SIN";
export type ValidationStatus = "PENDING_ALL" | "PENDING_TOTAL" | "PENDING_ALTA" | "PENDING_SIN";

export interface MatchRecord {
  PRUEBA_customer?: string | null;
  PRUEBA_nombre?: string | null;
  PRUEBA_cp?: string | null;
  MIN_codigo_centro?: string | null;
  MIN_source?: string | null;
  // Campos de negocio que uses para pintar detalle:
  id?: string | number;
  estado?: string;
  comentario?: string;
}

export interface ValidationWizardProps {
  isOpen: boolean;
  onClose: () => void;

  // Datos a validar
  data: MatchRecord[];

  // Abrir por tipo de validación o por estado
  kind?: ValidationKind | null;
  status?: ValidationStatus | null;

  // Callbacks de acción (opcionalmente asíncronos)
  onAccept?: (m: MatchRecord) => Promise<void> | void;
  onReject?: (m: MatchRecord) => Promise<void> | void;
  onStandBy?: (m: MatchRecord) => Promise<void> | void;
  onComment?: (m: MatchRecord, comment: string) => Promise<void> | void;
}

const modalStyles = {
  overlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(17, 24, 39, 0.45)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 50,
  },
  modal: {
    width: "min(1000px, 92vw)",
    maxHeight: "86vh",
    background: "#fff",
    borderRadius: 14,
    overflow: "hidden",
    boxShadow: "0 16px 60px rgba(0,0,0,.2)",
    display: "flex",
    flexDirection: "column" as const,
  },
  header: {
    padding: "14px 18px",
    borderBottom: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { margin: 0, fontSize: 16, fontWeight: 700 },
  body: {
    padding: 16,
    overflow: "auto",
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 12,
  } as React.CSSProperties,
  row: {
    border: "1px solid #e5e7eb",
    borderRadius: 10,
    padding: 12,
    display: "grid",
    gridTemplateColumns: "1fr auto",
    gap: 12,
  } as React.CSSProperties,
  fields: { display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 } as React.CSSProperties,
  actions: { display: "flex", gap: 8, alignItems: "center" } as React.CSSProperties,
  footer: {
    padding: 12,
    borderTop: "1px solid #e5e7eb",
    display: "flex",
    justifyContent: "flex-end",
    gap: 8,
  },
  btn: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    background: "#fff",
    cursor: "pointer",
  },
  btnPrimary: {
    padding: "8px 12px",
    borderRadius: 8,
    border: "1px solid #2563eb",
    background: "#2563eb",
    color: "#fff",
    cursor: "pointer",
  },
  input: {
    width: "100%",
    padding: "6px 8px",
    borderRadius: 6,
    border: "1px solid #e5e7eb",
  },
};

export const makeMatchKey = (m: MatchRecord) =>
  [
    m.PRUEBA_customer ?? "",
    m.PRUEBA_nombre ?? "",
    m.PRUEBA_cp ?? "",
    m.MIN_codigo_centro ?? "",
    m.MIN_source ?? "",
  ].join("||");

export const ValidationWizard: React.FC<ValidationWizardProps> = ({
  isOpen,
  onClose,
  data,
  kind,
  status,
  onAccept,
  onReject,
  onStandBy,
  onComment,
}) => {
  const [comments, setComments] = React.useState<Record<string, string>>({});

  const title =
    kind
      ? `Validación – ${kind}`
      : status
      ? `Validación – ${status}`
      : "Validación";

  const handleCommentChange = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setComments((s) => ({ ...s, [k]: e.target.value }));

  if (!isOpen) return null;

  return (
    <div style={modalStyles.overlay} role="dialog" aria-modal="true" aria-label={title}>
      <div style={modalStyles.modal}>
        <div style={modalStyles.header}>
          <h3 style={modalStyles.title}>{title}</h3>
          <button style={modalStyles.btn} onClick={onClose} aria-label="Cerrar">
            Cerrar
          </button>
        </div>

        <div style={modalStyles.body}>
          {data.length === 0 && (
            <div style={{ padding: 12, color: "#6b7280" }}>
              No hay elementos para mostrar.
            </div>
          )}

          {data.map((m) => {
            const k = makeMatchKey(m);
            return (
              <div key={k} style={modalStyles.row}>
                <div style={modalStyles.fields}>
                  <Field label="Customer" value={m.PRUEBA_customer} />
                  <Field label="Nombre" value={m.PRUEBA_nombre} />
                  <Field label="CP" value={m.PRUEBA_cp} />
                  <Field label="Código centro" value={m.MIN_codigo_centro} />
                  <Field label="Fuente" value={m.MIN_source} />
                </div>

                <div style={modalStyles.actions}>
                  <input
                    style={modalStyles.input}
                    placeholder="Comentario…"
                    value={comments[k] ?? ""}
                    onChange={handleCommentChange(k)}
                  />
                  <button
                    style={modalStyles.btnPrimary}
                    onClick={() => onAccept?.(m)}
                    aria-label="Aceptar"
                  >
                    Aceptar
                  </button>
                  <button
                    style={modalStyles.btn}
                    onClick={() => onReject?.(m)}
                    aria-label="Rechazar"
                  >
                    Rechazar
                  </button>
                  <button
                    style={modalStyles.btn}
                    onClick={() => onStandBy?.(m)}
                    aria-label="Stand-by"
                  >
                    Stand-by
                  </button>
                  <button
                    style={modalStyles.btn}
                    onClick={() => onComment?.(m, comments[k] ?? "")}
                    aria-label="Guardar comentario"
                  >
                    Guardar
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div style={modalStyles.footer}>
          <button style={modalStyles.btn} onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div>
    <div style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>{label}</div>
    <div style={{ fontWeight: 600 }}>{value ?? "—"}</div>
  </div>
);

export default ValidationWizard;
