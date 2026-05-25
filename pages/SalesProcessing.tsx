"use client";

import { useState, useMemo } from "react";
import {
  PlusIcon,
  AngleDownIcon,
  TrashBinIcon,
  BoxCubeIcon,
  DocsIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  CalenderIcon,
  BoxIconLine,
  DollarLineIcon,
  CloseLineIcon,
} from "@/icons/index";
import { useDarkMode } from "@/components/useDarkMode";
import { useMediaQuery } from "@/components/useMediaQuery";

type Product = {
  id: string;
  name: string;
  variation: string;
  price: number;
  stock: number;
  category: string;
};

type CartItem = Product & { quantity: number };

const mockProducts: Product[] = [
  { id: "1", name: "Ube Halaya", variation: "Smooth 500g", price: 180, stock: 120, category: "Ube Halaya" },
  { id: "2", name: "Ube Halaya", variation: "Tidbits 500g", price: 180, stock: 85, category: "Ube Halaya" },
  { id: "3", name: "Ube Jam", variation: "Smooth 300g", price: 120, stock: 15, category: "Ube Jam" },
  { id: "4", name: "Ube Jam", variation: "Tidbits 300g", price: 120, stock: 8, category: "Ube Jam" },
  { id: "5", name: "Ube Jam", variation: "Smooth 500g", price: 160, stock: 60, category: "Ube Jam" },
  { id: "6", name: "Ube Jam", variation: "Tidbits 500g", price: 160, stock: 44, category: "Ube Jam" },
];

export default function SalesProcessing() {
  const user = { id: "U-001", name: "Ana Reyes", role: "manager", location: "Store", username: "manager" };
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isInstitutional, setIsInstitutional] = useState(false);
  const [isPreOrder, setIsPreOrder] = useState(false);
  const [notes, setNotes] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "gcash">("cash");
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [lastOrder, setLastOrder] = useState<{ id: string; total: number } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const isMobile = useMediaQuery("(max-width: 768px)");
  const [showMobileCart, setShowMobileCart] = useState(false);

  // Design Tokens
  const dark = useDarkMode();
  const cardBg = dark ? "#212d40" : "#ffffff";
  const border = dark ? "#2d3748" : "#e4e7ec";
  const text = dark ? "#f0f4f8" : "#101828";
  const muted = dark ? "#8899aa" : "#667085";
  const inputBg = dark ? "#1a2231" : "#ffffff";
  const inputBorder = dark ? "#2d3748" : "#d0d5dd";
  const inputText = dark ? "#f0f4f8" : "#101828";
  const primary = "#465fff";

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "11px 14px", fontSize: 14,
    borderRadius: 8, border: `1px solid ${inputBorder}`,
    background: inputBg, color: inputText,
    outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    display: "block", fontSize: 13, fontWeight: 500,
    color: dark ? "#a0aec0" : "#344054", marginBottom: 7,
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.id === product.id
            ? { ...i, quantity: Math.min(i.quantity + 1, product.stock) }
            : i,
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const q = Math.max(1, Math.min(item.quantity + delta, item.stock));
          return { ...item, quantity: q };
        }
        return item;
      }),
    );
  };

  const removeFromCart = (id: string) => setCart((prev) => prev.filter((i) => i.id !== id));

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (isInstitutional) {
      if (!deliveryAddress.trim()) newErrors.deliveryAddress = "Delivery address is required";
      if (!contactPerson.trim()) newErrors.contactPerson = "Contact person is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCheckout = () => {
    if (validate()) {
      setShowCheckoutDialog(true);
    }
  };

  const confirmSale = () => {
    const orderId = `ORD-${String(Math.floor(Math.random() * 9000) + 1000)}`;
    setLastOrder({ id: orderId, total });
    setCart([]);
    setNotes("");
    setDeliveryAddress("");
    setContactPerson("");
    setIsInstitutional(false);
    setIsPreOrder(false);
    setShowCheckoutDialog(false);
    setTimeout(() => setLastOrder(null), 5000);
  };

  const categories = ["Ube Halaya", "Ube Jam"];

  const renderCart = (
    <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: isMobile ? 0 : 32, borderTopLeftRadius: isMobile ? 32 : 32, borderTopRightRadius: isMobile ? 32 : 32, overflow: "hidden", display: "flex", flexDirection: "column", height: isMobile ? "100%" : "auto" }}>
      <div style={{ padding: "24px 32px", borderBottom: `1px solid ${border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: dark ? cardBg : "#f8fafc" }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>Cart</h2>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {isMobile && (
            <button 
              onClick={() => setShowMobileCart(false)}
              style={{ width: 40, height: 40, borderRadius: 12, background: "transparent", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <CloseLineIcon viewBox="0 0 17 16" style={{ width: 16, height: 16, color: muted }} />
            </button>
          )}
          <div style={{ width: 40, height: 40, borderRadius: 12, background: inputBg, border: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BoxCubeIcon viewBox="0 0 24 24" style={{ width: 20, height: 20, color: muted }} />
          </div>
        </div>
      </div>

      {/* Order Mode Selector */}
      <div style={{ padding: 24, borderBottom: `1px solid ${border}66`, background: dark ? `${inputBg}55` : "#f8fafc55" }}>
        <div style={{ display: "flex", flexWrap: "wrap", background: dark ? cardBg : "#f1f5f9", padding: 4, borderRadius: 16, gap: 4 }}>
          <button 
            onClick={() => { setIsInstitutional(false); setIsPreOrder(false); }}
            style={{ flex: 1, minWidth: "30%", border: "none", borderRadius: 12, padding: "8px 0", fontSize: 10, fontWeight: 700, textTransform: "uppercase", cursor: "pointer", transition: "all 0.2s", background: (!isInstitutional && !isPreOrder) ? (dark ? inputBg : "#fff") : "transparent", color: (!isInstitutional && !isPreOrder) ? primary : muted, boxShadow: (!isInstitutional && !isPreOrder) ? "0 2px 4px rgba(0,0,0,0.05)" : "none" }}
          >Walk-in</button>
          <button 
            onClick={() => { setIsInstitutional(true); setIsPreOrder(false); }}
            style={{ flex: 1, minWidth: "30%", border: "none", borderRadius: 12, padding: "8px 0", fontSize: 10, fontWeight: 700, textTransform: "uppercase", cursor: "pointer", transition: "all 0.2s", background: isInstitutional ? (dark ? inputBg : "#fff") : "transparent", color: isInstitutional ? primary : muted, boxShadow: isInstitutional ? "0 2px 4px rgba(0,0,0,0.05)" : "none" }}
          >Institutional</button>
          <button 
            onClick={() => { setIsInstitutional(false); setIsPreOrder(true); }}
            style={{ flex: 1, minWidth: "30%", border: "none", borderRadius: 12, padding: "8px 0", fontSize: 10, fontWeight: 700, textTransform: "uppercase", cursor: "pointer", transition: "all 0.2s", background: isPreOrder ? (dark ? inputBg : "#fff") : "transparent", color: isPreOrder ? primary : muted, boxShadow: isPreOrder ? "0 2px 4px rgba(0,0,0,0.05)" : "none" }}
          >Pre-order</button>
        </div>

        {isInstitutional && (
          <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={labelStyle}>Notes / Customization</label>
              <textarea 
                style={{ ...inputStyle, minHeight: 80, resize: "none" }} 
                placeholder="Optional notes..." 
                value={notes} onChange={(e) => setNotes(e.target.value)} 
              />
            </div>
            <div>
              <label style={labelStyle}>Delivery Address</label>
              <input 
                style={{ ...inputStyle, borderColor: errors.deliveryAddress ? "#f04438" : inputBorder }} 
                placeholder="Complete address" 
                value={deliveryAddress} onChange={(e) => setDeliveryAddress(e.target.value)} 
              />
              {errors.deliveryAddress && <p style={{ color: "#f04438", fontSize: 10, fontWeight: 700, marginTop: 4 }}>{errors.deliveryAddress}</p>}
            </div>
            <div>
              <label style={labelStyle}>Contact Person</label>
              <input 
                style={{ ...inputStyle, borderColor: errors.contactPerson ? "#f04438" : inputBorder }} 
                placeholder="Name and number" 
                value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} 
              />
              {errors.contactPerson && <p style={{ color: "#f04438", fontSize: 10, fontWeight: 700, marginTop: 4 }}>{errors.contactPerson}</p>}
            </div>
          </div>
        )}

        {isPreOrder && (
          <div style={{ marginTop: 24, padding: 16, background: `${primary}10`, border: `1px solid ${primary}20`, borderRadius: 16, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: dark ? inputBg : "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
              <CalenderIcon viewBox="0 0 24 24" style={{ width: 20, height: 20, color: primary }} />
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 700, color: primary, textTransform: "uppercase", letterSpacing: "0.1em" }}>Pre-order Mode</p>
              <p style={{ fontSize: 12, fontWeight: 700, color: muted, margin: "2px 0 0" }}>Upfront Payment Required</p>
            </div>
          </div>
        )}
      </div>

      {/* Cart Items */}
      <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>
        {cart.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0" }}>
            <div style={{ width: 80, height: 80, borderRadius: 24, background: dark ? `${primary}10` : "#f8fafc", border: `1px solid ${border}44`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
              <BoxCubeIcon viewBox="0 0 24 24" style={{ width: 32, height: 32, color: `${muted}33` }} />
            </div>
            <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: `${text}44` }}>Cart is empty</h3>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {cart.map((item) => (
              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: inputBg, border: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                  {item.category === "Ube Halaya" ? "🍠" : "🫙"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{item.name}</p>
                  <p style={{ fontSize: 11, color: muted, textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.05em", margin: "2px 0 0" }}>{item.variation} · ₱{item.price}</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button onClick={() => updateQuantity(item.id, -1)} style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: dark ? cardBg : "#f1f5f9", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><AngleDownIcon viewBox="0 0 8 5" style={{ width: 14, height: 14 }} /></button>
                  <span style={{ fontSize: 14, fontWeight: 700, minWidth: 20, textAlign: "center" }}>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.id, 1)} style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: dark ? cardBg : "#f1f5f9", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><PlusIcon viewBox="0 0 12 12" style={{ width: 14, height: 14 }} /></button>
                  <button onClick={() => removeFromCart(item.id)} style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: "#f04438", display: "flex", alignItems: "center", justifyContent: "center" }}><TrashBinIcon viewBox="0 0 20 20" style={{ width: 14, height: 14 }} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ padding: 24, background: dark ? `${inputBg}88` : "#f8fafc88", borderTop: `1px solid ${border}`, display: "flex", flexDirection: "column", gap: 24 }}>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: `${muted}99`, marginBottom: 8 }}>
            <span>Items Count</span>
            <span style={{ color: text }}>{cart.reduce((s, i) => s + i.quantity, 0)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <span style={{ fontSize: 18, fontWeight: 700 }}>Total Price</span>
            <span style={{ fontSize: 28, fontWeight: 700, color: primary }}>₱{total.toLocaleString()}</span>
          </div>
        </div>
        <button
          disabled={cart.length === 0}
          onClick={handleCheckout}
          style={{ width: "100%", height: 64, borderRadius: 24, background: primary, color: "#fff", border: "none", fontSize: 16, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", cursor: "pointer", opacity: cart.length === 0 ? 0.3 : 1, transition: "transform 0.1s" }}
        >Complete Sale</button>
      </div>
    </div>
  );

  return (
    <div style={{ padding: isMobile ? "16px 12px" : 24, maxWidth: 1200, margin: "0 auto", color: text, fontFamily: "Inter, sans-serif", overflowX: "hidden" }}>
      {/* Header */}
      <div style={{ marginBottom: isMobile ? 24 : 32 }}>
        <h1 style={{ fontSize: isMobile ? 24 : 30, fontWeight: 700, margin: "0 0 8px" }}>Sales Processing</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: muted, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.05em" }}>
          <span>Process walk-in and institutional orders</span>
          <span>·</span>
          <div style={{ display: "flex", alignItems: "center", gap: 4, background: `${primary}15`, color: primary, padding: "2px 8px", borderRadius: 6, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
            Store <ChevronDownIcon viewBox="0 0 20 20" style={{ width: 14, height: 14 }} />
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 400px", gap: 32, alignItems: "start", paddingBottom: isMobile ? 120 : 0 }}>
        {/* Product Catalog */}
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: isMobile ? 20 : 32, overflow: "hidden" }}>
          <div style={{ padding: isMobile ? "20px 16px" : "24px 32px", borderBottom: `1px solid ${border}` }}>
            <h2 style={{ fontSize: isMobile ? 18 : 20, fontWeight: 700 }}>Product Catalog</h2>
          </div>
          <div style={{ padding: isMobile ? 16 : 32 }}>
            {categories.map((category) => (
              <div key={category} style={{ marginBottom: 40 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                  <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: `${muted}99` }}>{category}</h3>
                  <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg, ${border}, transparent)` }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: isMobile ? 16 : 24 }}>
                  {mockProducts
                    .filter((p) => p.category === category)
                    .map((product) => (
                      <ProductCard key={product.id} product={product} onAdd={() => addToCart(product)} primary={primary} muted={muted} text={text} border={border} cardBg={cardBg} inputBg={inputBg} dark={dark} isMobile={isMobile} />
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop Shopping Cart */}
        {!isMobile && (
          <div style={{ position: "sticky", top: 24, height: "calc(100vh - 48px)", display: "flex", flexDirection: "column" }}>
            {renderCart}
          </div>
        )}
      </div>

      {/* Mobile Floating Cart Button */}
      {isMobile && !showMobileCart && (
        <div 
          onClick={() => setShowMobileCart(true)}
          style={{ position: "fixed", bottom: 24, left: 24, right: 24, background: primary, color: "#fff", padding: "16px 24px", borderRadius: 20, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 10px 25px -5px rgba(0,0,0,0.3)", zIndex: 40, cursor: "pointer" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ position: "relative" }}>
              <BoxCubeIcon style={{ width: 24, height: 24 }} viewBox="0 0 24 24" />
              {cart.length > 0 && (
                <div style={{ position: "absolute", top: -6, right: -6, background: "#f04438", color: "#fff", fontSize: 10, fontWeight: 700, width: 18, height: 18, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${primary}` }}>
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </div>
              )}
            </div>
            <span style={{ fontWeight: 700, fontSize: 15 }}>View Cart</span>
          </div>
          <span style={{ fontSize: 18, fontWeight: 700 }}>₱{total.toLocaleString()}</span>
        </div>
      )}

      {/* Mobile Cart Modal */}
      {isMobile && showMobileCart && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)", zIndex: 9999, display: "flex", alignItems: "flex-end", animation: "slideIn 0.3s ease-out" }}>
          <div style={{ width: "100%", height: "85vh", display: "flex", flexDirection: "column" }}>
            {renderCart}
          </div>
        </div>
      )}

      {/* Checkout Dialog */}
      {showCheckoutDialog && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100000 }}>
          <div style={{ background: cardBg, width: isMobile ? "calc(100% - 32px)" : "100%", maxWidth: 380, borderRadius: isMobile ? 24 : 32, padding: isMobile ? 24 : 32, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", position: "relative" }}>
            <button 
              onClick={() => setShowCheckoutDialog(false)}
              style={{ position: "absolute", top: 20, right: 20, width: 32, height: 32, borderRadius: 8, border: `1px solid ${border}`, background: cardBg, color: muted, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
            >
              <CloseLineIcon viewBox="0 0 17 16" style={{ width: 14, height: 14 }} />
            </button>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ width: 64, height: 64, borderRadius: 20, background: `${primary}15`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px" }}>
                <DocsIcon viewBox="0 0 24 24" style={{ width: 32, height: 32, color: primary }} />
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: "0 0 4px" }}>{isPreOrder ? "Complete Pre-order" : "Confirm Sale"}</h2>
              <p style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.1em" }}>{isPreOrder ? "Upfront Payment Required" : "Verify details for receipt"}</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24, maxHeight: 150, overflowY: "auto", paddingRight: 8 }}>
              {cart.map((item) => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <p style={{ fontSize: 12, fontWeight: 700, margin: 0 }}>{item.name}</p>
                    <p style={{ fontSize: 10, color: muted, fontWeight: 700, textTransform: "uppercase" }}>{item.variation} × {item.quantity}</p>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>₱{(item.price * item.quantity).toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div style={{ height: 1, background: border, margin: "0 0 20px" }} />

            {isPreOrder && (
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Payment Method</label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <button onClick={() => setPaymentMethod("cash")} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, border: `2px solid ${paymentMethod === "cash" ? primary : border}`, background: paymentMethod === "cash" ? `${primary}05` : "transparent", cursor: "pointer", color: paymentMethod === "cash" ? primary : muted }}>
                    <DollarLineIcon viewBox="0 0 25 24" style={{ width: 20, height: 20 }} />
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>Cash</span>
                  </button>
                  <button onClick={() => setPaymentMethod("gcash")} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: 12, borderRadius: 12, border: `2px solid ${paymentMethod === "gcash" ? primary : border}`, background: paymentMethod === "gcash" ? `${primary}05` : "transparent", cursor: "pointer", color: paymentMethod === "gcash" ? primary : muted }}>
                    <BoxIconLine viewBox="0 0 24 24" style={{ width: 20, height: 20 }} />
                    <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase" }}>GCash</span>
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
              <span style={{ fontSize: 15, fontWeight: 700 }}>Grand Total</span>
              <span style={{ fontSize: 24, fontWeight: 700, color: primary }}>₱{total.toLocaleString()}</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button onClick={() => setShowCheckoutDialog(false)} style={{ height: 48, borderRadius: 16, border: "none", background: "transparent", fontWeight: 700, fontSize: 11, textTransform: "uppercase", cursor: "pointer", color: muted }}>Cancel</button>
              <button onClick={confirmSale} style={{ height: 48, borderRadius: 16, border: "none", background: primary, color: "#fff", fontWeight: 700, fontSize: 11, textTransform: "uppercase", cursor: "pointer" }}>{isPreOrder ? "Process" : "Confirm"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {lastOrder && (
        <div style={{ position: "fixed", bottom: isMobile ? 20 : 40, right: isMobile ? 20 : 40, left: isMobile ? 20 : "auto", width: isMobile ? "auto" : 340, background: cardBg, border: `1px solid ${border}`, borderRadius: isMobile ? 20 : 32, padding: isMobile ? 20 : 24, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", display: "flex", gap: isMobile ? 16 : 20, zIndex: 100001, animation: "slideIn 0.5s ease-out" }}>
          <div style={{ width: 56, height: 56, borderRadius: 22, background: dark ? "#064e3b" : "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${dark ? "#065f46" : "#dcfce7"}` }}>
            <CheckCircleIcon viewBox="0 0 24 24" style={{ width: 32, height: 32, color: "#22c55e" }} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
              <p style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{lastOrder.id} Completed</p>
              <CloseLineIcon viewBox="0 0 17 16" style={{ width: 16, height: 16, color: muted, cursor: "pointer" }} onClick={() => setLastOrder(null)} />
            </div>
            <p style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 16px" }}>Total ₱{lastOrder.total.toLocaleString()}.00</p>
            <div style={{ height: 6, background: "#f1f5f9", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", background: "#22c55e", width: "100%" }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductCard({ product, onAdd, primary, muted, text, border, cardBg, inputBg, dark, isMobile }: { product: Product; onAdd: () => void; primary: string; muted: string; text: string; border: string; cardBg: string; inputBg: string; dark: boolean; isMobile: boolean }) {
  const isLow = product.stock <= 15;
  return (
    <div
      onClick={onAdd}
      style={{ display: "flex", alignItems: "center", gap: isMobile ? 12 : 20, padding: isMobile ? 16 : 24, borderRadius: isMobile ? 20 : 28, background: cardBg, border: `1px solid ${border}`, cursor: "pointer", transition: "all 0.3s" }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = dark ? `0 20px 25px -5px ${primary}33` : "0 20px 25px -5px rgba(0,0,0,0.1)"; e.currentTarget.style.borderColor = `${primary}44`; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = border; }}
    >
      <div style={{ width: isMobile ? 60 : 72, height: isMobile ? 60 : 72, borderRadius: isMobile ? 16 : 24, background: inputBg, border: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? 28 : 32 }}>
        {product.category === "Ube Halaya" ? "🍠" : "🫙"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>{product.name}</h3>
          <div style={{ padding: "4px 10px", borderRadius: 8, fontSize: 10, fontWeight: 700, background: isLow ? "#f04438" : inputBg, color: isLow ? "#fff" : muted, border: `1px solid ${isLow ? "#f04438" : border}` }}>
            {product.stock}
          </div>
        </div>
        <p style={{ fontSize: 11, fontWeight: 700, color: muted, textTransform: "uppercase", letterSpacing: "0.1em", margin: "4px 0 12px" }}>{product.variation}</p>
        <p style={{ fontSize: 20, fontWeight: 700, color: primary, margin: 0 }}>₱{product.price}</p>
      </div>
    </div>
  );
}
