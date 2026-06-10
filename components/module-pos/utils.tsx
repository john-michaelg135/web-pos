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
        gap: 8,
        marginTop: isSmall ? 2 : 4,
        marginBottom: isSmall ? 2 : 4,
      }}
    >
      {packaging && (
        <span
          style={{
            padding: isSmall ? "2.5px 7px" : "4px 10px",
            borderRadius: 5,
            background: inputBgStyle,
            border: `1px solid ${borderStyle}`,
            fontSize: isSmall ? 11 : 13,
            fontWeight: 700,
            textTransform: "uppercase",
            color: mutedColor,
          }}
        >
          {packaging}
        </span>
      )}
      {size && (
        <span
          style={{
            padding: isSmall ? "2.5px 7px" : "4px 10px",
            borderRadius: 5,
            background: inputBgStyle,
            border: `1px solid ${borderStyle}`,
            fontSize: isSmall ? 11 : 13,
            fontWeight: 700,
            textTransform: "uppercase",
            color: mutedColor,
          }}
        >
          {size}
        </span>
      )}
      {sku && (
        <span
          style={{
            fontSize: isSmall ? 11 : 13,
            fontFamily: "monospace",
            color: mutedColor,
            opacity: 0.8,
            letterSpacing: "0.05em",
          }}
        >
          {sku}
        </span>
      )}
    </div>
  );
}
