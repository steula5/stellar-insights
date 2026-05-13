import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { parseFile } from "@/lib/parser";
import { useDataStore } from "@/store/useDataStore";

export function ImportZone({ compact = false }: { compact?: boolean }) {
  const { files, addImport, removeYear, clearAll } = useDataStore();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const onDrop = useCallback(
    async (accepted: File[]) => {
      setBusy(true);
      setErrors([]);
      const errs: string[] = [];
      for (const file of accepted) {
        const res = await parseFile(file);
        if ("error" in res) errs.push(res.error);
        else addImport(res.year, file.name, res.result.records);
      }
      setErrors(errs);
      setBusy(false);
    },
    [addImport],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: true,
  });

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={`relative cursor-pointer rounded-xl border border-dashed transition-all ${
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/40 hover:bg-accent/30"
        } ${compact ? "px-4 py-4" : "px-6 py-8"}`}
      >
        <input {...getInputProps()} />
        <div className="flex items-center gap-4">
          <div className="size-10 rounded-lg bg-primary/10 grid place-items-center text-primary">
            <Upload className="size-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">
              {busy ? "Processando..." : "Arraste arquivos Excel ou clique para selecionar"}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Múltiplos .xlsx (ex: Resumo-Vendas-2024.xlsx). O ano é detectado pelo nome.
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive"
          >
            {errors.map((e, i) => (
              <div key={i} className="flex items-start gap-2">
                <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
                <span>{e}</span>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {files.length > 0 && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {files.length} arquivo{files.length > 1 ? "s" : ""} carregado{files.length > 1 ? "s" : ""}
            </div>
            <button
              onClick={clearAll}
              className="text-[11px] text-muted-foreground hover:text-destructive transition"
            >
              Limpar tudo
            </button>
          </div>
          <div className="space-y-1">
            {files.map((f) => (
              <motion.div
                key={f.year}
                layout
                className="flex items-center justify-between rounded-md border border-border bg-card/50 px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <CheckCircle2 className="size-3.5 text-success shrink-0" />
                  <FileSpreadsheet className="size-3.5 text-muted-foreground shrink-0" />
                  <div className="text-xs truncate">
                    <span className="font-medium">{f.year}</span>
                    <span className="text-muted-foreground"> · {f.name}</span>
                    <span className="text-muted-foreground"> · {f.rows.toLocaleString("pt-BR")} linhas</span>
                  </div>
                </div>
                <button
                  onClick={() => removeYear(f.year)}
                  className="text-muted-foreground hover:text-destructive transition"
                >
                  <X className="size-3.5" />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
