"use client";

import React from "react";

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number; // e.g. 10, 25, 50, or -1 for "Semua"
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string; // e.g. "data" or "warga" or "kecamatan"
  className?: string;
  style?: React.CSSProperties;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, -1],
  itemLabel = "data",
  className = "",
  style = {},
}: PaginationProps) {
  const isAll = pageSize === -1 || pageSize >= totalItems;
  const startItem = totalItems === 0 ? 0 : isAll ? 1 : (currentPage - 1) * pageSize + 1;
  const endItem = isAll ? totalItems : Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers array with smart ellipsis (...)
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [];
    pages.push(1);
    if (currentPage > 3) {
      pages.push("...");
    }

    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push("...");
    }
    pages.push(totalPages);
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div
      className={`pagination-container ${className}`}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
        padding: "12px 16px",
        background: "var(--surface, #ffffff)",
        borderTop: "1px solid var(--border, #e2e8f0)",
        fontSize: 13,
        color: "var(--text, #1e293b)",
        borderRadius: "0 0 12px 12px",
        ...style,
      }}
    >
      {/* Per Page Selector & Info */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: "var(--text-muted, #64748b)" }}>Tampilkan:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              const val = Number(e.target.value);
              onPageSizeChange(val);
            }}
            aria-label="Jumlah baris per halaman"
            style={{
              padding: "5px 10px",
              borderRadius: 6,
              border: "1px solid var(--border, #cbd5e1)",
              background: "var(--surface-2, #f8fafc)",
              color: "var(--text, #0f172a)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              outline: "none",
            }}
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt === -1 ? "Semua" : `${opt} / hlm`}
              </option>
            ))}
          </select>
        </div>

        <div style={{ color: "var(--text-muted, #64748b)" }}>
          {totalItems === 0 ? (
            <span>Tidak ada {itemLabel}</span>
          ) : isAll ? (
            <span>
              Menampilkan <strong style={{ color: "var(--text, #0f172a)" }}>semua {totalItems}</strong> {itemLabel}
            </span>
          ) : (
            <span>
              Menampilkan <strong style={{ color: "var(--text, #0f172a)" }}>{startItem} - {endItem}</strong> dari{" "}
              <strong style={{ color: "var(--text, #0f172a)" }}>{totalItems}</strong> {itemLabel}
            </span>
          )}
        </div>
      </div>

      {/* Pagination Controls */}
      {!isAll && totalPages > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {/* First Page */}
          <button
            onClick={() => onPageChange(1)}
            disabled={currentPage === 1}
            title="Halaman Pertama"
            aria-label="Halaman Pertama"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 32,
              height: 32,
              padding: "0 6px",
              borderRadius: 6,
              border: "1px solid var(--border, #cbd5e1)",
              background: "var(--surface-2, #f8fafc)",
              color: currentPage === 1 ? "var(--text-muted, #94a3b8)" : "var(--text, #1e293b)",
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
              opacity: currentPage === 1 ? 0.5 : 1,
              fontWeight: 600,
            }}
          >
            «
          </button>

          {/* Previous Page */}
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            title="Halaman Sebelumnya"
            aria-label="Halaman Sebelumnya"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 32,
              height: 32,
              padding: "0 6px",
              borderRadius: 6,
              border: "1px solid var(--border, #cbd5e1)",
              background: "var(--surface-2, #f8fafc)",
              color: currentPage === 1 ? "var(--text-muted, #94a3b8)" : "var(--text, #1e293b)",
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
              opacity: currentPage === 1 ? 0.5 : 1,
              fontWeight: 600,
            }}
          >
            ‹
          </button>

          {/* Page Numbers */}
          {pages.map((p, idx) => {
            if (p === "...") {
              return (
                <span
                  key={`dots-${idx}`}
                  style={{
                    padding: "0 6px",
                    color: "var(--text-muted, #94a3b8)",
                    userSelect: "none",
                  }}
                >
                  ...
                </span>
              );
            }
            const isCurrent = p === currentPage;
            return (
              <button
                key={p}
                onClick={() => onPageChange(Number(p))}
                aria-label={`Halaman ${p}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 32,
                  height: 32,
                  padding: "0 8px",
                  borderRadius: 6,
                  border: isCurrent
                    ? "1px solid var(--primary, #1A6EA8)"
                    : "1px solid var(--border, #cbd5e1)",
                  background: isCurrent ? "var(--primary, #1A6EA8)" : "var(--surface-2, #f8fafc)",
                  color: isCurrent ? "#ffffff" : "var(--text, #1e293b)",
                  fontWeight: isCurrent ? 700 : 500,
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {p}
              </button>
            );
          })}

          {/* Next Page */}
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            title="Halaman Berikutnya"
            aria-label="Halaman Berikutnya"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 32,
              height: 32,
              padding: "0 6px",
              borderRadius: 6,
              border: "1px solid var(--border, #cbd5e1)",
              background: "var(--surface-2, #f8fafc)",
              color: currentPage === totalPages ? "var(--text-muted, #94a3b8)" : "var(--text, #1e293b)",
              cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              opacity: currentPage === totalPages ? 0.5 : 1,
              fontWeight: 600,
            }}
          >
            ›
          </button>

          {/* Last Page */}
          <button
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage === totalPages}
            title="Halaman Terakhir"
            aria-label="Halaman Terakhir"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: 32,
              height: 32,
              padding: "0 6px",
              borderRadius: 6,
              border: "1px solid var(--border, #cbd5e1)",
              background: "var(--surface-2, #f8fafc)",
              color: currentPage === totalPages ? "var(--text-muted, #94a3b8)" : "var(--text, #1e293b)",
              cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              opacity: currentPage === totalPages ? 0.5 : 1,
              fontWeight: 600,
            }}
          >
            »
          </button>
        </div>
      )}
    </div>
  );
}
