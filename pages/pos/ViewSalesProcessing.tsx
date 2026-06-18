"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import axios from "axios";
import {
  PlusIcon,
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
import { apiClient } from "../../components/module-pos/api";
import { PosButton as Button } from "@/components/module-pos/PosButton";
import { PosInput as Input } from "@/components/module-pos/PosInput";
import { PosTextArea as TextArea } from "@/components/module-pos/PosTextArea";
import { useRouter } from "next/navigation";
import Label from "@/components/form/Label";
import { toast } from "sonner";
import { renderVariationBadges } from "@/components/module-pos/utils";
import { useAuth } from "@/context/AuthContext";
import { AccessDenied } from "@/components/module-pos/AccessDenied";


const MinusIcon = ({ style }: { style?: React.CSSProperties }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);
import { useTheme as useRealTheme } from "@/context/ThemeContext";
import { useMediaQuery } from "@/components/module-pos/useMediaQuery";

const useTheme = () => {
  try {
    return useRealTheme();
  } catch (e) {
    return { theme: "light" as const, toggleTheme: () => { } };
  }
};

type Product = {
  id: string;
  name: string;
  variation: string;
  price: number;
  stock: number;
  category: string;
};

type CartItem = Product & { quantity: number };

const mockProducts: Product[] = [];

const toTitleCase = (str: string) => {
  if (!str) return "";
  return str
    .toLowerCase()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase())
    .replace(/\s+/g, " ")
    .trim();
};

export default function ViewSalesProcessing() {
  const { user: authUser, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [locationName, setLocationName] = useState<string>("");
  const [locationType, setLocationType] = useState<string>("");

  useEffect(() => {
    if (authLoading || !authUser) return;
    if (authUser.username !== "posuser" && !authUser.apps.includes("sales-processing")) return;
    setIsMounted(true);
    const fetchProducts = async () => {
      try {
        const locationIdVal = authUser.locationId || 1;
        const apiGatewayUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/';
        const basePosUrl = `${apiGatewayUrl.replace(/\/$/, '')}/api/pos`;
        
        // Fetch products directly with a cache-buster to ensure we always get the latest items
        // Gateway: /api/pos → strips prefix → forwards to api-pos, so path needs /api-pos/ prefix
        const response = await axios.get(`${basePosUrl}/api-pos/order-entry/product-grid?locationId=${locationIdVal}&_t=${Date.now()}`, {
          withCredentials: true
        });
        
        if (response.data) {
          const data = response.data;
          const mapped = data.map((p: any) => ({
            id: p.variationId?.toString() || "0",
            name: p.productName || "Unknown",
            variation: p.variationName || "Unknown",
            price: Number(p.price) || 0,
            stock: Number(p.stockQuantity) || 0,
            category: p.productCategory || "Uncategorized"
          }));
          setProducts(mapped);
        } else {
          setProducts([]);
        }
      } catch (err) {
        console.error("Error fetching products, falling back to mock:", err);
      }
    };

    const fetchLocationInfo = async () => {
      try {
        const { data } = await apiClient.apiPos.locationsList();
        const locationIdVal = authUser.locationId || 1;
        const matched = data.find(l => Number(l.locationId) === Number(locationIdVal));
        if (matched) {
          setLocationName(matched.locationName || "");
          setLocationType(matched.locationType || "");
        }
      } catch (err) {
        console.error("Error fetching location info:", err);
      }
    };

    fetchProducts();
    fetchLocationInfo();
  }, [authUser, authLoading]);

  const user = { id: "U-001", name: "Ana Reyes", role: "manager", location: "Store", username: "manager" };
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isInstitutional, setIsInstitutional] = useState(false);
  const [isPreOrder, setIsPreOrder] = useState(false);
  const [notes, setNotes] = useState("");
  const [street, setStreet] = useState("");
  const [barangay, setBarangay] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [zipCode, setZipCode] = useState("");

  const [contactPerson, setContactPerson] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [showOrderTypeDropdown, setShowOrderTypeDropdown] = useState(false);
  const [showInstitutionalModal, setShowInstitutionalModal] = useState(false);

  const orderTypeDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        orderTypeDropdownRef.current &&
        !orderTypeDropdownRef.current.contains(event.target as Node)
      ) {
        setShowOrderTypeDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "gcash">("cash");
  const [showCheckoutDialog, setShowCheckoutDialog] = useState(false);
  const [lastOrder, setLastOrder] = useState<{ id: string; total: number } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // US-6 & US-7: Discounts & Vouchers
  const [isSeniorPWD, setIsSeniorPWD] = useState(false);
  const [idNumber, setIdNumber] = useState("");
  const [pwdCustomerName, setPwdCustomerName] = useState("");
  const [pwdStreet, setPwdStreet] = useState("");
  const [pwdBarangay, setPwdBarangay] = useState("");
  const [pwdCity, setPwdCity] = useState("");
  const [pwdProvince, setPwdProvince] = useState("");
  const [pwdZipCode, setPwdZipCode] = useState("");
  const [isPrintingReceipt, setIsPrintingReceipt] = useState(true);

  const isMobile = useMediaQuery("(max-width: 768px)");
  const [showMobileCart, setShowMobileCart] = useState(false);

  // Design Tokens
  const { theme } = useTheme();
  const dark = theme === "dark";
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
    if (product.stock === 0) {
      toast.error("Alert: There are no more stocks left.");
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.id === product.id
            ? { ...i, quantity: Math.min((Number(i.quantity) || 0) + 1, product.stock) }
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
          const currentQty = typeof item.quantity === "number" ? item.quantity : 1;
          const q = Math.max(1, Math.min(currentQty + delta, item.stock));
          return { ...item, quantity: q };
        }
        return item;
      }),
    );
  };

  const handleQuantityChange = (id: string, valStr: string, stock: number) => {
    const clean = valStr.replace(/\D/g, "");
    if (clean === "") {
      setCart((prev) =>
        prev.map((item) => (item.id === id ? { ...item, quantity: "" as any } : item))
      );
      return;
    }
    const val = parseInt(clean, 10);
    if (val === 0) {
      setCart((prev) =>
        prev.map((item) => (item.id === id ? { ...item, quantity: 0 } : item))
      );
      return;
    }
    const clamped = Math.min(val, stock);
    setCart((prev) =>
      prev.map((item) => (item.id === id ? { ...item, quantity: clamped } : item))
    );
  };

  const handleQuantityBlur = (id: string, currentQty: any, stock: number) => {
    if (currentQty === "" || currentQty === 0 || isNaN(currentQty)) {
      setCart((prev) =>
        prev.map((item) => (item.id === id ? { ...item, quantity: 1 } : item))
      );
    }
  };

  const removeFromCart = (id: string) => setCart((prev) => prev.filter((i) => i.id !== id));

  const subtotal = cart.reduce((sum, item) => sum + item.price * (Number(item.quantity) || 0), 0);

  const pwdDetails = useMemo(() => {
    if (!isSeniorPWD) {
      return {
        vatExempt: 0,
        discount: 0,
        total: subtotal
      };
    }
    let vatExemptTotal = 0;
    let discountTotal = 0;
    let finalTotal = 0;

    cart.forEach(item => {
      const qty = Number(item.quantity) || 0;
      const basePrice = item.price;
      const vatExemptPrice = Math.round((basePrice / 1.12) * 100) / 100;
      const discountedPrice = Math.round((vatExemptPrice * 0.80) * 100) / 100;
      
      const itemVatExempt = (basePrice - vatExemptPrice) * qty;
      const itemDiscount = (vatExemptPrice * 0.20) * qty;
      const itemFinal = discountedPrice * qty;

      vatExemptTotal += itemVatExempt;
      discountTotal += itemDiscount;
      finalTotal += itemFinal;
    });

    return {
      vatExempt: vatExemptTotal,
      discount: discountTotal,
      total: finalTotal
    };
  }, [cart, isSeniorPWD, subtotal]);

  const vatAmount = isSeniorPWD ? 0 : subtotal * 0.12;
  const discountAmount = isSeniorPWD ? pwdDetails.discount : 0;
  const total = isSeniorPWD ? pwdDetails.total : subtotal;

  const validate = () => {
    // Normalize empty or zero quantities to 1
    let hasInvalidQty = false;
    const sanitizedCart = cart.map((item) => {
      if ((item.quantity as any) === "" || item.quantity === 0 || isNaN(Number(item.quantity))) {
        hasInvalidQty = true;
        return { ...item, quantity: 1 };
      }
      return item;
    });
    if (hasInvalidQty) {
      setCart(sanitizedCart);
    }

    const newErrors: Record<string, string> = {};
    if (isInstitutional) {
      const normContactPerson = toTitleCase(contactPerson);
      const normStreet = toTitleCase(street);
      const normBarangay = toTitleCase(barangay);
      const normCity = toTitleCase(city);
      const normProvince = toTitleCase(province);

      setContactPerson(normContactPerson);
      setStreet(normStreet);
      setBarangay(normBarangay);
      setCity(normCity);
      setProvince(normProvince);

      if (!normContactPerson.trim()) {
        newErrors.contactPerson = "Please input Contact Name";
      }
      if (!contactNumber.trim()) {
        newErrors.contactNumber = "Please enter Contact Number.";
      }
      if (!normStreet.trim()) {
        newErrors.street = "Please input Street";
      }
      if (!normBarangay.trim()) {
        newErrors.barangay = "Please input Barangay";
      }
      if (!normCity.trim()) {
        newErrors.city = "Please input City";
      }
      if (!normProvince.trim()) {
        newErrors.province = "Please input Province";
      }
      if (!zipCode.trim()) {
        newErrors.zipCode = "Please input Zip Code";
      } else if (!/^\d{4}$/.test(zipCode.trim())) {
        newErrors.zipCode = "Zip Code must be a 4-digit number";
      }
    }
    if (isSeniorPWD) {
      const trimmedId = idNumber.trim();
      if (!trimmedId) {
        newErrors.idNumber = "Please input information";
      } else if (!/^\d{2}-\d{4}-\d{3}-\d{7}$/.test(trimmedId)) {
        newErrors.idNumber = "Invalid format. Expected: RR-PPMM-BBB-NNNNNNN";
      }

      const normPwdCustomerName = toTitleCase(pwdCustomerName);
      const normPwdStreet = toTitleCase(pwdStreet);
      const normPwdBarangay = toTitleCase(pwdBarangay);
      const normPwdCity = toTitleCase(pwdCity);
      const normPwdProvince = toTitleCase(pwdProvince);

      setPwdCustomerName(normPwdCustomerName);
      setPwdStreet(normPwdStreet);
      setPwdBarangay(normPwdBarangay);
      setPwdCity(normPwdCity);
      setPwdProvince(normPwdProvince);

      if (!normPwdCustomerName.trim()) {
        newErrors.pwdCustomerName = "Please input Customer Name";
      }
      if (!normPwdStreet.trim()) {
        newErrors.pwdStreet = "Please input Street";
      }
      if (!normPwdBarangay.trim()) {
        newErrors.pwdBarangay = "Please input Barangay";
      }
      if (!normPwdCity.trim()) {
        newErrors.pwdCity = "Please input City";
      }
      if (!normPwdProvince.trim()) {
        newErrors.pwdProvince = "Please input Province";
      }
      if (!pwdZipCode.trim()) {
        newErrors.pwdZipCode = "Please input Zip Code";
      } else if (!/^\d{4}$/.test(pwdZipCode.trim())) {
        newErrors.pwdZipCode = "Zip Code must be 4 digits";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };


  const handleCheckout = () => {
    if (cart.length === 0 || total <= 0) {
      toast.error("Error: There is no product item selected.");
      return;
    }
    if (validate()) {
      setShowCheckoutDialog(true);
    } else {
      if (isInstitutional) {
        const hasInstitutionalErrors =
          !contactPerson.trim() ||
          !contactNumber.trim() ||
          !street.trim() ||
          !barangay.trim() ||
          !city.trim() ||
          !province.trim() ||
          !zipCode.trim() ||
          !/^\d{4}$/.test(zipCode.trim());
        if (hasInstitutionalErrors) {
          setShowInstitutionalModal(true);
        }
      }
    }
  };

  const confirmSale = async () => {
    if (cart.length === 0 || total <= 0) {
      toast.error("Error: There is no product item selected.");
      return;
    }
    try {
      const payload = {
        cart,
        subtotal,
        vatAmount,
        discountAmount,
        total,
        paymentMethod,
        isInstitutional,
        isPreOrder,
        customerDetails: isInstitutional ? { notes, street, barangay, city, province, zipCode, contactPerson, contactNumber } : null,
      };

      let orderId = `ORD-${String(Math.floor(Math.random() * 9000) + 1000)}`;
      try {
        const items = cart.map(item => ({
            variationId: Number(item.id),
            quantity: Number(item.quantity) || 1
        }));

        const locationIdVal = authUser?.locationId || 1;
        if (isInstitutional) {
            const { data: response } = await apiClient.apiPos.orderEntryOrdersInstitutionalCreate({
                locationId: locationIdVal,
                deliveryAddress: `${street}, ${barangay}, ${city}, ${province} ${zipCode}`,
                contactPerson: contactPerson,
                customVariationNotes: notes,
                paymentMethod: "COD",
                submittedBy: 1,
                items: items
            });
            if (response && response.orderNumber) orderId = response.orderNumber;
        } else {
            const { data: response } = await (apiClient.apiPos.orderEntryOrdersCreate as any)({
                orderType: "Store",
                locationId: locationIdVal,
                submittedBy: 1,
                paymentMethod: paymentMethod === "cash" ? "Cash" : "GCash",
                applyPwdDiscount: isSeniorPWD,
                items: items,
                seniorPwdId: isSeniorPWD ? idNumber : null,
                seniorPwdName: isSeniorPWD ? pwdCustomerName : null,
                seniorPwdStreet: isSeniorPWD ? pwdStreet : null,
                seniorPwdBarangay: isSeniorPWD ? pwdBarangay : null,
                seniorPwdCity: isSeniorPWD ? pwdCity : null,
                seniorPwdProvince: isSeniorPWD ? pwdProvince : null,
                seniorPwdZipCode: isSeniorPWD ? pwdZipCode : null
            });
            if (response && response.orderNumber) orderId = response.orderNumber;
            
            // If it's preorder, set it as preorder
            if (isPreOrder && response) {
                await apiClient.apiPos.orderEntryOrdersPreorderUpdate(Number(response.orderId), { isPreorder: true });
            }

            if (response && response.paymentUrl) {
                const url = response.paymentUrl;
                setCart([]);
                setNotes("");
                setStreet("");
                setBarangay("");
                setCity("");
                setProvince("");
                setZipCode("");
                setContactPerson("");
                setContactNumber("");
                setIsInstitutional(false);
                setIsPreOrder(false);
                setIsSeniorPWD(false);
                setIdNumber("");
                setPwdCustomerName("");
                setPwdStreet("");
                setPwdBarangay("");
                setPwdCity("");
                setPwdProvince("");
                setPwdZipCode("");
                setShowCheckoutDialog(false);

                toast.success("Order submitted! Redirecting to Xendit payment gateway...");
                setTimeout(() => {
                    window.location.href = url;
                }, 1000);
                return;
            }
        }
      } catch (err) {
        console.error("Checkout failed, continuing offline mode for demo:", err);
      }

      if (isPrintingReceipt) {
        console.log("Generating receipt for order:", orderId);
      }
      setLastOrder({ id: orderId, total });
      setCart([]);
      setNotes("");
      setStreet("");
      setBarangay("");
      setCity("");
      setProvince("");
      setZipCode("");
      setContactPerson("");
      setContactNumber("");
      setIsInstitutional(false);
      setIsPreOrder(false);
      setIsSeniorPWD(false);
      setIdNumber("");
      setPwdCustomerName("");
      setPwdStreet("");
      setPwdBarangay("");
      setPwdCity("");
      setPwdProvince("");
      setPwdZipCode("");
      setShowCheckoutDialog(false);
      setTimeout(() => setLastOrder(null), 5000);
    } catch (error) {
      console.error("Checkout failed:", error);
    }
  };

  const categories = Array.from(new Set(products.map(p => p.category)));

  const renderCart = (
    <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: isMobile ? 0 : 16, borderTopLeftRadius: isMobile ? 16 : 16, borderTopRightRadius: isMobile ? 16 : 16, overflow: "hidden", display: "flex", flexDirection: "column", height: isMobile ? "100%" : "auto" }}>
      <div style={{ padding: isMobile ? "12px 16px" : "14px 16px", borderBottom: `1px solid ${border}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: dark ? cardBg : "#f8fafc", flexShrink: 0 }}>
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

          {/* Active Mode Dropdown Trigger */}
          <div ref={orderTypeDropdownRef} style={{ position: "relative" }}>
            <button
              onClick={() => setShowOrderTypeDropdown(!showOrderTypeDropdown)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "8px 12px",
                borderRadius: 10,
                background: dark ? "#1a2231" : "#ffffff",
                border: `1px solid ${border}`,
                color: text,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {isPreOrder ? "Pre-order" : isInstitutional ? "Institutional" : "Walk-in"}
              <ChevronDownIcon viewBox="0 0 20 20" style={{ width: 14, height: 14, color: muted }} />
            </button>
            {showOrderTypeDropdown && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  marginTop: 6,
                  background: cardBg,
                  border: `1px solid ${border}`,
                  borderRadius: 12,
                  boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)",
                  zIndex: 1000,
                  minWidth: 150,
                  overflow: "hidden",
                }}
              >
                <button
                  onClick={() => {
                    setIsInstitutional(false);
                    setIsPreOrder(false);
                    setShowOrderTypeDropdown(false);
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    textAlign: "left",
                    background: (!isInstitutional && !isPreOrder) ? (dark ? "#2d3748" : "#f1f5f9") : "transparent",
                    color: (!isInstitutional && !isPreOrder) ? primary : text,
                    border: "none",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Walk-in
                </button>
                <button
                  onClick={() => {
                    setIsInstitutional(true);
                    setIsPreOrder(false);
                    setShowOrderTypeDropdown(false);
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    textAlign: "left",
                    background: isInstitutional ? (dark ? "#2d3748" : "#f1f5f9") : "transparent",
                    color: isInstitutional ? primary : text,
                    border: "none",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Institutional
                </button>
                <button
                  onClick={() => {
                    setIsInstitutional(false);
                    setIsPreOrder(true);
                    setShowOrderTypeDropdown(false);
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    textAlign: "left",
                    background: isPreOrder ? (dark ? "#2d3748" : "#f1f5f9") : "transparent",
                    color: isPreOrder ? primary : text,
                    border: "none",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Pre-order
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ flex: isMobile ? 1 : "none", overflowY: isMobile ? "auto" : "visible", display: "flex", flexDirection: "column", paddingRight: 4 }}>
        {/* Order Mode Info Panel */}
        {(isPreOrder || isInstitutional) && (
          <div style={{ padding: isMobile ? 12 : 16, borderBottom: `1px solid ${border}66`, background: dark ? `${inputBg}55` : "#f8fafc55" }}>
            {isInstitutional && (
              <div style={{ padding: 12, background: `${primary}10`, border: `1px solid ${primary}20`, borderRadius: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: dark ? inputBg : "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <DocsIcon viewBox="0 0 24 24" style={{ width: 16, height: 16, color: primary }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 10, fontWeight: 700, color: primary, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>Institutional Mode</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowInstitutionalModal(true)}
                    style={{ background: "transparent", border: "none", color: primary, fontSize: 12, fontWeight: 700, cursor: "pointer", textDecoration: "underline", padding: 0 }}
                  >
                    {contactPerson ? "Edit Details" : "Add Details"}
                  </button>
                </div>
                {contactPerson ? (
                  <div style={{ fontSize: 12, color: text, display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                    <p style={{ margin: 0 }}><strong>Contact Name:</strong> {contactPerson}</p>
                    {contactNumber && <p style={{ margin: 0 }}><strong>Contact Number:</strong> {contactNumber}</p>}
                    <p style={{ margin: 0 }}><strong>Address:</strong> {street}, {city}, {province} {zipCode}</p>
                    {notes && <p style={{ margin: 0 }}><strong>Notes:</strong> {notes}</p>}
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                    <p style={{ fontSize: 12, color: muted, margin: 0 }}>No details added yet.</p>
                  </div>
                )}
              </div>
            )}

            {isPreOrder && (
              <div style={{ padding: 12, background: `${primary}10`, border: `1px solid ${primary}20`, borderRadius: 16, display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: dark ? inputBg : "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
                  <CalenderIcon viewBox="0 0 24 24" style={{ width: 20, height: 20, color: primary }} />
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: primary, textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>Pre-order Mode</p>
                  <p style={{ fontSize: 12, fontWeight: 700, color: muted, margin: "2px 0 0" }}>Upfront Payment Required</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cart Items */}
        <div style={{ padding: isMobile ? 12 : 16 }}>
          {cart.length === 0 ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <div style={{ width: 80, height: 80, borderRadius: 24, background: dark ? `${primary}10` : "#f8fafc", border: `1px solid ${border}44`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                <BoxCubeIcon viewBox="0 0 24 24" style={{ width: 32, height: 32, color: `${muted}33` }} />
              </div>
              <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: `${text}44` }}>Cart is empty</h3>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {cart.map((item) => (
                <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: inputBg, border: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>
                    {item.category === "Ube Halaya" ? "🍠" : "🫙"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{item.name}</p>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 2 }}>
                      {renderVariationBadges(item.variation, muted, border, inputBg, false)}
                      <p style={{ fontSize: 11, color: muted, fontWeight: 700, margin: 0 }}>₱{item.price}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button onClick={() => updateQuantity(item.id, -1)} style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: dark ? cardBg : "#f1f5f9", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><MinusIcon style={{ width: 14, height: 14 }} /></button>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(item.id, e.target.value, item.stock)}
                      onBlur={() => handleQuantityBlur(item.id, item.quantity, item.stock)}
                      style={{
                        width: 36,
                        height: 28,
                        borderRadius: 8,
                        border: `1px solid ${border}`,
                        background: dark ? inputBg : "#ffffff",
                        color: text,
                        fontSize: 13,
                        fontWeight: 700,
                        textAlign: "center",
                        outline: "none",
                        boxSizing: "border-box",
                        padding: 0,
                      }}
                    />
                    <button onClick={() => updateQuantity(item.id, 1)} style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: dark ? cardBg : "#f1f5f9", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><PlusIcon viewBox="0 0 12 12" style={{ width: 14, height: 14 }} /></button>
                    <button onClick={() => removeFromCart(item.id)} style={{ width: 28, height: 28, borderRadius: 8, border: "none", background: "transparent", cursor: "pointer", color: "#f04438", display: "flex", alignItems: "center", justifyContent: "center" }}><TrashBinIcon viewBox="0 0 20 20" style={{ width: 14, height: 14 }} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div style={{ padding: isMobile ? 12 : 16, background: dark ? `${inputBg}88` : "#f8fafc88", borderTop: `1px solid ${border}`, display: "flex", flexDirection: "column", gap: 16, flexShrink: 0 }}>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {/* Senior/PWD Checkbox Toggle */}
            <div
              style={{
                width: "100%",
                padding: "0 12px",
                borderRadius: 12,
                border: `1px solid ${border}`,
                background: cardBg,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                height: 44,
                boxSizing: "border-box"
              }}
            >
              <span style={{ fontSize: 12, fontWeight: 700 }}>Senior/PWD</span>
              <input type="checkbox" checked={isSeniorPWD} onChange={(e) => setIsSeniorPWD(e.target.checked)} style={{ width: 16, height: 16, cursor: "pointer" }} />
            </div>
          </div>

          {/* ID Number input shown below if checked */}
          {isSeniorPWD && (
            <div style={{ padding: 12, borderRadius: 12, border: `1px solid ${border}`, background: cardBg, display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={labelStyle}>ID Number <span style={{ color: "#f04438" }}>*</span></label>
              <input
                style={{
                  ...inputStyle,
                  borderColor: errors.idNumber ? "#f04438" : inputBorder,
                  boxShadow: errors.idNumber ? (dark ? "0 0 0 3px rgba(240, 68, 56, 0.25)" : "0 0 0 3px #fee4e2") : "none"
                }}
                maxLength={20}
                placeholder="13-7600-000-0000123"
                value={idNumber} onChange={(e) => {
                  const val = e.target.value;
                  if (val.length < idNumber.length) {
                    if (idNumber.endsWith("-") && !val.endsWith("-")) {
                      const clean = val.replace(/\D/g, "");
                      const digits = clean.slice(0, clean.length - 1);
                      let formatted = "";
                      if (digits.length > 0) formatted += digits.substring(0, 2);
                      if (digits.length > 2) formatted += "-" + digits.substring(2, 6);
                      if (digits.length > 6) formatted += "-" + digits.substring(6, 9);
                      if (digits.length > 9) formatted += "-" + digits.substring(9, 16);
                      setIdNumber(formatted);
                    } else {
                      setIdNumber(val);
                    }
                  } else {
                    const digits = val.replace(/\D/g, "").slice(0, 16);
                    let formatted = "";
                    if (digits.length > 0) formatted += digits.substring(0, 2);
                    if (digits.length > 2) formatted += "-" + digits.substring(2, 6);
                    if (digits.length > 6) formatted += "-" + digits.substring(6, 9);
                    if (digits.length > 9) formatted += "-" + digits.substring(9, 16);
                    setIdNumber(formatted);
                  }
                  if (errors.idNumber) setErrors(prev => { const { idNumber, ...rest } = prev; return rest; });
                }}
              />
              {errors.idNumber && <span style={{ fontSize: 11, color: "#f04438", marginTop: 4, display: "block" }}>{errors.idNumber}</span>}

              {/* Customer Name */}
              <label style={{ ...labelStyle, marginTop: 6 }}>Customer Name <span style={{ color: "#f04438" }}>*</span></label>
              <input
                style={{
                  ...inputStyle,
                  borderColor: errors.pwdCustomerName ? "#f04438" : inputBorder,
                  boxShadow: errors.pwdCustomerName ? (dark ? "0 0 0 3px rgba(240, 68, 56, 0.25)" : "0 0 0 3px #fee4e2") : "none"
                }}
                maxLength={50}
                placeholder="Juan Dela Cruz"
                value={pwdCustomerName}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[^a-zA-Z\s.\-,]/g, "");
                  setPwdCustomerName(cleaned);
                  if (errors.pwdCustomerName) setErrors(prev => { const { pwdCustomerName, ...rest } = prev; return rest; });
                }}
                onBlur={() => {
                  setPwdCustomerName(toTitleCase(pwdCustomerName));
                }}
              />
              {errors.pwdCustomerName && <span style={{ fontSize: 11, color: "#f04438", marginTop: 4, display: "block" }}>{errors.pwdCustomerName}</span>}

              {/* Street */}
              <label style={{ ...labelStyle, marginTop: 6 }}>Street <span style={{ color: "#f04438" }}>*</span></label>
              <input
                style={{
                  ...inputStyle,
                  borderColor: errors.pwdStreet ? "#f04438" : inputBorder,
                  boxShadow: errors.pwdStreet ? (dark ? "0 0 0 3px rgba(240, 68, 56, 0.25)" : "0 0 0 3px #fee4e2") : "none"
                }}
                maxLength={100}
                placeholder="123 Maple St."
                value={pwdStreet}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[^a-zA-Z0-9\s.\-,\/#]/g, "");
                  setPwdStreet(cleaned);
                  if (errors.pwdStreet) setErrors(prev => { const { pwdStreet, ...rest } = prev; return rest; });
                }}
                onBlur={() => {
                  setPwdStreet(toTitleCase(pwdStreet));
                }}
              />
              {errors.pwdStreet && <span style={{ fontSize: 11, color: "#f04438", marginTop: 4, display: "block" }}>{errors.pwdStreet}</span>}

              {/* Barangay */}
              <label style={{ ...labelStyle, marginTop: 6 }}>Barangay <span style={{ color: "#f04438" }}>*</span></label>
              <input
                style={{
                  ...inputStyle,
                  borderColor: errors.pwdBarangay ? "#f04438" : inputBorder,
                  boxShadow: errors.pwdBarangay ? (dark ? "0 0 0 3px rgba(240, 68, 56, 0.25)" : "0 0 0 3px #fee4e2") : "none"
                }}
                maxLength={50}
                placeholder="Barangay 12"
                value={pwdBarangay}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/[^a-zA-Z0-9\s.\-,\/#]/g, "");
                  setPwdBarangay(cleaned);
                  if (errors.pwdBarangay) setErrors(prev => { const { pwdBarangay, ...rest } = prev; return rest; });
                }}
                onBlur={() => {
                  setPwdBarangay(toTitleCase(pwdBarangay));
                }}
              />
              {errors.pwdBarangay && <span style={{ fontSize: 11, color: "#f04438", marginTop: 4, display: "block" }}>{errors.pwdBarangay}</span>}

              {/* City & Province */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 6 }}>
                <div>
                  <label style={labelStyle}>City <span style={{ color: "#f04438" }}>*</span></label>
                  <input
                    style={{
                      ...inputStyle,
                      borderColor: errors.pwdCity ? "#f04438" : inputBorder,
                      boxShadow: errors.pwdCity ? (dark ? "0 0 0 3px rgba(240, 68, 56, 0.25)" : "0 0 0 3px #fee4e2") : "none"
                    }}
                    maxLength={50}
                    placeholder="City"
                    value={pwdCity}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^a-zA-Z\s.\-,]/g, "");
                      setPwdCity(cleaned);
                      if (errors.pwdCity) setErrors(prev => { const { pwdCity, ...rest } = prev; return rest; });
                    }}
                    onBlur={() => {
                      setPwdCity(toTitleCase(pwdCity));
                    }}
                  />
                  {errors.pwdCity && <span style={{ fontSize: 11, color: "#f04438", marginTop: 4, display: "block" }}>{errors.pwdCity}</span>}
                </div>
                <div>
                  <label style={labelStyle}>Province <span style={{ color: "#f04438" }}>*</span></label>
                  <input
                    style={{
                      ...inputStyle,
                      borderColor: errors.pwdProvince ? "#f04438" : inputBorder,
                      boxShadow: errors.pwdProvince ? (dark ? "0 0 0 3px rgba(240, 68, 56, 0.25)" : "0 0 0 3px #fee4e2") : "none"
                    }}
                    maxLength={50}
                    placeholder="Province"
                    value={pwdProvince}
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^a-zA-Z\s.\-,]/g, "");
                      setPwdProvince(cleaned);
                      if (errors.pwdProvince) setErrors(prev => { const { pwdProvince, ...rest } = prev; return rest; });
                    }}
                    onBlur={() => {
                      setPwdProvince(toTitleCase(pwdProvince));
                    }}
                  />
                  {errors.pwdProvince && <span style={{ fontSize: 11, color: "#f04438", marginTop: 4, display: "block" }}>{errors.pwdProvince}</span>}
                </div>
              </div>

              {/* Zip Code */}
              <label style={{ ...labelStyle, marginTop: 6 }}>Zip Code <span style={{ color: "#f04438" }}>*</span></label>
              <input
                style={{
                  ...inputStyle,
                  borderColor: errors.pwdZipCode ? "#f04438" : inputBorder,
                  boxShadow: errors.pwdZipCode ? (dark ? "0 0 0 3px rgba(240, 68, 56, 0.25)" : "0 0 0 3px #fee4e2") : "none"
                }}
                maxLength={4}
                placeholder="1000"
                value={pwdZipCode}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "").slice(0, 4);
                  setPwdZipCode(val);
                  if (errors.pwdZipCode) setErrors(prev => { const { pwdZipCode, ...rest } = prev; return rest; });
                }}
              />
              {errors.pwdZipCode && <span style={{ fontSize: 11, color: "#f04438", marginTop: 4, display: "block" }}>{errors.pwdZipCode}</span>}
            </div>
          )}
        </div>

        <div style={{ height: 1, background: border, margin: "8px 0" }} />

        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.15em", color: `${muted}99`, marginBottom: 8 }}>
            <span>Subtotal</span>
            <span style={{ color: text }}>₱{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          {isSeniorPWD && (
            <>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#f04438", marginBottom: 8 }}>
                <span>VAT Exemption (12%)</span>
                <span>- ₱{pwdDetails.vatExempt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "#f04438", marginBottom: 8 }}>
                <span>Senior/PWD Discount (20%)</span>
                <span>- ₱{pwdDetails.discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: 8 }}>
            <span style={{ fontSize: 18, fontWeight: 700 }}>Total Price</span>
            <span style={{ fontSize: 28, fontWeight: 700, color: primary }}>₱{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
        <button
          disabled={cart.length === 0}
          onClick={handleCheckout}
          style={{ width: "100%", height: 56, borderRadius: 16, background: primary, color: "#fff", border: "none", fontSize: 15, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", cursor: "pointer", opacity: cart.length === 0 ? 0.3 : 1 }}
        >Complete Sale</button>
      </div>
    </div>
  );

  const hasAccess = authUser && (authUser.username === "posuser" || authUser.apps.includes("sales-processing") || authUser.roles?.includes("Admin") || authUser.subRole === "Admin");

  useEffect(() => {
    if (!authLoading && !hasAccess) {
      router.replace("/access-denied");
    }
  }, [authUser, authLoading, hasAccess, router]);

  if (authLoading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;

  if (!hasAccess) {
    return null;
  }

  if (!isMounted) return null;

  return (
    <div className="w-full h-screen p-4 md:p-6 bg-gray-50 dark:bg-gray-950 flex flex-col gap-4 md:gap-6 overflow-y-auto animate-in fade-in duration-500" style={{ color: text }}>
      <style>{`
        /* Custom thin scrollbar styling */
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: ${dark ? "#4a5568" : "#cbd5e1"};
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: ${dark ? "#718096" : "#94a3b8"};
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: ${dark ? "#4a5568 transparent" : "#cbd5e1 transparent"};
        }
      `}</style>
      {/* Header */}
      <div className="flex-shrink-0">
        <h1 className="text-xl font-semibold text-gray-800 dark:text-white/90">Sales Processing</h1>
        <div className="mt-1 text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
          <span>Process walk-in and institutional orders</span>
          <span>·</span>
          <div style={{ display: "flex", alignItems: "center", gap: 4, background: `${primary}15`, color: primary, padding: "2px 8px", borderRadius: 6, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>
            {locationType && locationName ? `${locationType} - ${locationName}` : "Store"} <ChevronDownIcon viewBox="0 0 20 20" style={{ width: 14, height: 14 }} />
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0" style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 420px", gap: isMobile ? 16 : 24, paddingBottom: isMobile ? 120 : 0 }}>
        {/* Product Catalog */}
        <div style={{ background: cardBg, border: `1px solid ${border}`, borderRadius: isMobile ? 12 : 16, overflow: "hidden" }}>
          <div style={{ padding: isMobile ? "12px 14px" : "16px 20px", borderBottom: `1px solid ${border}` }}>
            <h2 style={{ fontSize: isMobile ? 18 : 20, fontWeight: 700 }}>Product Catalog</h2>
          </div>
          <div style={{ padding: isMobile ? 12 : 20 }}>
            {categories.map((category) => (
              <div key={category} style={{ marginBottom: isMobile ? 20 : 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: isMobile ? 12 : 16 }}>
                  <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em", color: `${muted}99` }}>{category}</h3>
                  <div style={{ height: 1, flex: 1, background: `linear-gradient(90deg, ${border}, transparent)` }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill, minmax(280px, 1fr))", gap: isMobile ? 8 : 16 }}>
                  {products
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
          <div style={{ display: "flex", flexDirection: "column" }}>
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
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ position: "relative", marginRight: 8 }}>
              <BoxCubeIcon style={{ width: 24, height: 24 }} viewBox="0 0 24 24" />
              {cart.length > 0 && (
                <div style={{ position: "absolute", top: -8, right: -12, background: "#f04438", color: "#fff", fontSize: 10, fontWeight: 700, width: 18, height: 18, borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", border: `2px solid ${primary}` }}>
                  {cart.reduce((s, i) => s + (Number(i.quantity) || 0), 0)}
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
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 w-full max-w-4xl mx-4 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 sm:px-6 sm:py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10 rounded-t-2xl">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                {isPreOrder ? "Complete Pre-order" : "Confirm Sale"}
              </h2>
            </div>

            {/* Body */}
            <div className="px-5 py-4 sm:px-6 sm:py-5 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                    Items Summary
                  </h3>
                  <div className="flex flex-col gap-3 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                    {cart.map((item) => (
                      <div key={item.id} className="flex justify-between items-center text-sm">
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="font-bold m-0 text-gray-900 dark:text-white">{item.name}</p>
                          <div className="flex flex-col gap-1 mt-1">
                            {renderVariationBadges(item.variation, dark ? "#8899aa" : "#667085", dark ? "#2d3748" : "#e4e7ec", dark ? "#1a2231" : "#ffffff", false)}
                            <p className="text-xs text-gray-500 font-bold uppercase m-0">Qty: {item.quantity}</p>
                          </div>
                        </div>
                        <span className="font-bold text-gray-900 dark:text-white shrink-0">₱{(item.price * (Number(item.quantity) || 0)).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {isInstitutional && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm">
                      <p className="text-xs font-bold text-brand-500 uppercase tracking-widest mb-2">Delivery & Contact Details</p>
                      <div className="flex flex-col gap-1 text-gray-700 dark:text-gray-300">
                        <p className="m-0"><strong>Name / Org:</strong> {contactPerson}</p>
                        {contactNumber && <p className="m-0"><strong>Contact Number:</strong> {contactNumber}</p>}
                        <p className="m-0"><strong>Address:</strong> {street}, {barangay}, {city}, {province} {zipCode}</p>
                        {notes && <p className="m-0"><strong>Notes:</strong> {notes}</p>}
                      </div>
                    </div>
                  )}

                  {!isInstitutional && (
                    <div>
                      <Label>Payment Method</Label>
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <button onClick={() => setPaymentMethod("cash")} className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors ${paymentMethod === "cash" ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" : "border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300 dark:hover:border-gray-600"}`}>
                          <DollarLineIcon viewBox="0 0 25 24" className="w-5 h-5" />
                          <span className="text-xs font-bold uppercase">Cash</span>
                        </button>
                        <button onClick={() => setPaymentMethod("gcash")} className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors ${paymentMethod === "gcash" ? "border-brand-500 bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400" : "border-gray-200 dark:border-gray-700 text-gray-500 hover:border-gray-300 dark:hover:border-gray-600"}`}>
                          <BoxIconLine viewBox="0 0 24 24" className="w-5 h-5" />
                          <span className="text-xs font-bold uppercase">E-Wallet / Card / QR PH</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between px-2 mt-2">
                    <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Print Receipt</span>
                    <input type="checkbox" checked={isPrintingReceipt} onChange={(e) => setIsPrintingReceipt(e.target.checked)} className="w-5 h-5 cursor-pointer accent-brand-500 rounded border-gray-300 focus:ring-brand-500" />
                  </div>

                  {isSeniorPWD && (
                    <div className="flex flex-col gap-2 border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Subtotal (VAT-Inclusive)</span>
                        <span className="font-semibold text-gray-900 dark:text-white">₱{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-sm text-red-500">
                        <span>VAT Exemption (12%)</span>
                        <span>- ₱{pwdDetails.vatExempt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-sm text-red-500">
                        <span>Senior/PWD Discount (20%)</span>
                        <span>- ₱{pwdDetails.discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-end border-t border-gray-200 dark:border-gray-700 pt-4 mt-2">
                    <span className="text-base font-bold text-gray-900 dark:text-white">Grand Total</span>
                    <span className="text-2xl font-bold text-brand-500">₱{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-5 py-3 sm:px-6 sm:py-4 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl">
              <Button variant="outline" onClick={() => setShowCheckoutDialog(false)}>Cancel</Button>
              <Button variant="primary" onClick={confirmSale}>{isPreOrder ? "Process" : "Confirm"}</Button>
            </div>
          </div>
        </div>
      )}
      {/* Institutional Details Modal */}
      {showInstitutionalModal && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 w-full max-w-4xl mx-4 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[96vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 sm:px-6 sm:py-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10 rounded-t-2xl">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                Institutional Details
              </h2>
            </div>

            {/* Body */}
            <div className="px-5 py-4 sm:px-6 sm:py-5 overflow-y-auto custom-scrollbar flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label>Name / Organization <span className="text-red-500">*</span></Label>
                  <Input
                    type="text"
                    placeholder="Name / Organization"
                    maxLength={50}
                    value={contactPerson} 
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^a-zA-Z\s.\-,]/g, "");
                      setContactPerson(cleaned);
                      if (errors.contactPerson) setErrors(prev => { const { contactPerson, ...rest } = prev; return rest; });
                    }}
                    onBlur={() => {
                      setContactPerson(toTitleCase(contactPerson));
                    }}
                    error={errors.contactPerson}
                  />
                </div>

                <div>
                  <Label>Contact Number <span className="text-red-500">*</span></Label>
                  <Input
                    type="text"
                    placeholder="(+63) 912 345 6789"
                    maxLength={18}
                    value={contactNumber} 
                    onChange={(e) => {
                      let val = e.target.value;
                      if (!val) {
                        setContactNumber("");
                      } else {
                        let digits = val.replace(/\D/g, "");
                        if (digits.startsWith("63")) {
                          digits = digits.substring(2);
                        } else if (digits.startsWith("0")) {
                          digits = digits.substring(1);
                        }
                        
                        if (digits.length > 0) {
                          let formatted = "(+63) ";
                          formatted += digits.substring(0, 3);
                          if (digits.length > 3) {
                            formatted += " " + digits.substring(3, 6);
                          }
                          if (digits.length > 6) {
                            formatted += " " + digits.substring(6, 10);
                          }
                          setContactNumber(formatted);
                        } else {
                          setContactNumber("");
                        }
                      }
                      if (errors.contactNumber) setErrors(prev => { const { contactNumber, ...rest } = prev; return rest; });
                    }}
                    error={errors.contactNumber}
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label>Street <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="Street"
                    maxLength={100}
                    value={street} 
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^a-zA-Z0-9\s.\-,\/#]/g, "");
                      setStreet(cleaned);
                      if (errors.street) setErrors(prev => { const { street, ...rest } = prev; return rest; });
                    }}
                    onBlur={() => {
                      setStreet(toTitleCase(street));
                    }}
                    error={errors.street}
                  />
                </div>

                <div>
                  <Label>Barangay <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="Barangay"
                    maxLength={50}
                    value={barangay} 
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^a-zA-Z0-9\s.\-,\/#]/g, "");
                      setBarangay(cleaned);
                      if (errors.barangay) setErrors(prev => { const { barangay, ...rest } = prev; return rest; });
                    }}
                    onBlur={() => {
                      setBarangay(toTitleCase(barangay));
                    }}
                    error={errors.barangay}
                  />
                </div>
                <div>
                  <Label>City <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="City"
                    maxLength={50}
                    value={city} 
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^a-zA-Z\s.\-,]/g, "");
                      setCity(cleaned);
                      if (errors.city) setErrors(prev => { const { city, ...rest } = prev; return rest; });
                    }}
                    onBlur={() => {
                      setCity(toTitleCase(city));
                    }}
                    error={errors.city}
                  />
                </div>

                <div>
                  <Label>Province <span className="text-red-500">*</span></Label>
                  <Input
                    placeholder="Province"
                    maxLength={50}
                    value={province} 
                    onChange={(e) => {
                      const cleaned = e.target.value.replace(/[^a-zA-Z\s.\-,]/g, "");
                      setProvince(cleaned);
                      if (errors.province) setErrors(prev => { const { province, ...rest } = prev; return rest; });
                    }}
                    onBlur={() => {
                      setProvince(toTitleCase(province));
                    }}
                    error={errors.province}
                  />
                </div>
                <div>
                  <Label>Zip Code <span className="text-red-500">*</span></Label>
                  <Input
                    type="text"
                    placeholder="Zip"
                    maxLength={4}
                    value={zipCode} 
                    onChange={(e) => {
                      const cleanVal = e.target.value.replace(/\D/g, "").slice(0, 4);
                      setZipCode(cleanVal);
                      if (errors.zipCode) setErrors(prev => { const { zipCode, ...rest } = prev; return rest; });
                    }}
                    error={errors.zipCode}
                  />
                </div>

                <div className="sm:col-span-2">
                  <Label>Notes / Customization</Label>
                  <TextArea
                    placeholder="Optional notes..."
                    maxLength={500}
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)}
                    rows={4}
                    style={{ resize: "none" }}
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-5 py-3 sm:px-6 sm:py-4 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl">
              <Button
                variant="outline"
                onClick={() => setShowInstitutionalModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  let isValid = true;
                  const newErrors: any = {};
                  const normContactPerson = toTitleCase(contactPerson);
                  const normStreet = toTitleCase(street);
                  const normBarangay = toTitleCase(barangay);
                  const normCity = toTitleCase(city);
                  const normProvince = toTitleCase(province);
                  
                  setContactPerson(normContactPerson);
                  setStreet(normStreet);
                  setBarangay(normBarangay);
                  setCity(normCity);
                  setProvince(normProvince);

                  if (!normContactPerson.trim()) { newErrors.contactPerson = "Required"; isValid = false; }
                  if (!contactNumber.trim() || contactNumber.replace(/\D/g,"").length < 10) { newErrors.contactNumber = "Invalid Contact Number"; isValid = false; }
                  if (!normStreet.trim()) { newErrors.street = "Required"; isValid = false; }
                  if (!normBarangay.trim()) { newErrors.barangay = "Required"; isValid = false; }
                  if (!normCity.trim()) { newErrors.city = "Required"; isValid = false; }
                  if (!normProvince.trim()) { newErrors.province = "Required"; isValid = false; }
                  if (!zipCode.trim()) { newErrors.zipCode = "Required"; isValid = false; }
                  
                  if (!isValid) {
                    setErrors(newErrors);
                    toast.error("Please complete all required details.");
                    return;
                  }
                  
                  setShowInstitutionalModal(false);
                  setShowCheckoutDialog(true);
                }}
              >
                Save Details
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Success Toast */}
      {lastOrder && (
        <div style={{ position: "fixed", bottom: isMobile ? 20 : 40, right: isMobile ? 20 : 40, left: isMobile ? 20 : "auto", width: isMobile ? "auto" : 340, background: cardBg, border: `1px solid ${border}`, borderRadius: isMobile ? 16 : 24, padding: isMobile ? 16 : 20, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)", display: "flex", gap: isMobile ? 16 : 20, zIndex: 100001, animation: "slideIn 0.5s ease-out" }}>
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
      style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 8, padding: isMobile ? 6 : 8, borderRadius: isMobile ? 8 : 10, background: cardBg, border: `1px solid ${border}`, cursor: "pointer" }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = dark ? `0 20px 25px -5px ${primary}33` : "0 20px 25px -5px rgba(0,0,0,0.1)"; e.currentTarget.style.borderColor = `${primary}44`; }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = border; }}
    >
      <div style={{ width: isMobile ? 36 : 44, height: isMobile ? 36 : 44, borderRadius: isMobile ? 8 : 10, background: inputBg, border: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: isMobile ? 16 : 20 }}>
        {product.category === "Ube Halaya" ? "🍠" : "🫙"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>{product.name}</h3>
          <div style={{ padding: "4px 10px", borderRadius: 8, fontSize: 10, fontWeight: 700, background: isLow ? "#f04438" : inputBg, color: isLow ? "#fff" : muted, border: `1px solid ${isLow ? "#f04438" : border}` }}>
            {product.stock}
          </div>
        </div>
        <div style={{ marginTop: 2, marginBottom: 4 }}>
          {renderVariationBadges(product.variation, muted, border, inputBg, false)}
        </div>
        <p style={{ fontSize: 16, fontWeight: 700, color: primary, margin: 0 }}>₱{product.price}</p>
      </div>
    </div>
  );
}
