import React from "react";

export function parseVariationName(variationName: string) {
  if (!variationName) return { sku: "", packaging: "", size: "" };
  const parts = variationName.split("|");
  if (parts.length === 3) {
    return {
      sku: parts[0]?.trim() || "",
      packaging: parts[1]?.trim() || "",
      size: parts[2]?.trim() || "",
    };
  }
  if (parts.length === 2) {
    return {
      sku: parts[0]?.trim() || "",
      packaging: "",
      size: parts[1]?.trim() || "",
    };
  }
  return { sku: variationName.trim(), packaging: "", size: "" };
}

export function renderVariationBadges(
  variationName: string,
  mutedColor: string,
  borderStyle: string,
  inputBgStyle: string,
  isSmall = false
) {
  const { sku, packaging, size } = parseVariationName(variationName);

  if (!packaging && !size) {
    return (
      <span
        style={{
          fontSize: isSmall ? 12 : 14,
          fontWeight: 700,
          color: mutedColor,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          display: "inline-block",
        }}
      >
        {variationName}
      </span>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 6,
        marginTop: isSmall ? 2 : 4,
        marginBottom: isSmall ? 2 : 4,
      }}
    >
      {packaging && (
        <span
          style={{
            padding: isSmall ? "2px 8px" : "3px 10px",
            borderRadius: 6,
            background: "#eef1f6",
            border: "1px solid #e2e6ed",
            fontSize: isSmall ? 10 : 12,
            fontWeight: 600,
            textTransform: "uppercase",
            color: "#4a5568",
            letterSpacing: "0.02em",
          }}
        >
          {packaging}
        </span>
      )}
      {size && (
        <span
          style={{
            padding: isSmall ? "2px 8px" : "3px 10px",
            borderRadius: 6,
            background: "#eef1f6",
            border: "1px solid #e2e6ed",
            fontSize: isSmall ? 10 : 12,
            fontWeight: 600,
            textTransform: "uppercase",
            color: "#4a5568",
            letterSpacing: "0.02em",
          }}
        >
          {size}
        </span>
      )}
      {sku && (
        <span
          style={{
            fontSize: isSmall ? 10 : 12,
            fontFamily: "monospace",
            color: "#94a3b8",
            letterSpacing: "0.03em",
          }}
        >
          {sku}
        </span>
      )}
    </div>
  );
}
