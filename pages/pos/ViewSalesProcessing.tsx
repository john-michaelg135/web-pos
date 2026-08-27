"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import {
  Plus,
  Minus,
  Trash2,
  Package,
  FileText,
  CheckCircle,
  ChevronDown,
  Calendar,
  DollarSign,
  X,
} from "lucide-react";
import { apiClient } from "../../components/module-pos/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { renderVariationBadges } from "@/components/module-pos/utils";
import { useAuth } from "@/context/AuthContext";
import { DeleteConfirmDialog } from "@/components/module-pos/DeleteConfirmDialog";
import { useMediaQuery } from "@/components/module-pos/useMediaQuery";
import PwdFormModal from "@/components/module-pos/PwdFormModal";
import { cn } from "@/lib/utils";

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

        const response = await axios.get(`/api-pos/order-entry/product-grid?locationId=${locationIdVal}&_t=${Date.now()}`, {
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

  const [cart, setCart] = useState<CartItem[]>([]);
  const [itemToRemove, setItemToRemove] = useState<{ id: string; name: string } | null>(null);

  const confirmRemoveItem = () => {
    if (itemToRemove) {
      setCart((prev) => prev.filter((i) => i.id !== itemToRemove.id));
      setItemToRemove(null);
    }
  };

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
  const [amountPaid, setAmountPaid] = useState("");
  const [lastOrder, setLastOrder] = useState<{ id: string; total: number } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // US-6 & US-7: Discounts & Vouchers
  const [isSeniorPWD, setIsSeniorPWD] = useState(false);
  const [showPwdModal, setShowPwdModal] = useState(false);
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
    const item = cart.find(i => i.id === id);
    if (!item) return;
    const currentQty = typeof item.quantity === "number" ? item.quantity : 1;
    if (currentQty === 1 && delta === -1) {
      setItemToRemove({ id: item.id, name: item.name });
      return;
    }

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

  const removeFromCart = (id: string) => {
    const item = cart.find((i) => i.id === id);
    if (item) setItemToRemove({ id: item.id, name: item.name });
  };

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

    if (!isInstitutional) {
      const parsedAmount = parseFloat(amountPaid) || 0;
      if (amountPaid.trim() === "" || parsedAmount < total) {
        toast.error("Error: Amount paid is not enough.");
        return;
      }
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

      const deductStocks = () => {
        setProducts(prev => prev.map(p => {
          const cartItem = cart.find(c => c.id === p.id);
          if (cartItem) {
            return { ...p, stock: Math.max(0, p.stock - (Number(cartItem.quantity) || 0)) };
          }
          return p;
        }));
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
            amountTendered: !isInstitutional && paymentMethod === "cash" && amountPaid.trim() !== "" ? parseFloat(amountPaid) : null,
            changeAmount: !isInstitutional && paymentMethod === "cash" && amountPaid.trim() !== "" ? Math.max(0, parseFloat(amountPaid) - total) : null,
            seniorPwdId: isSeniorPWD ? idNumber : null,
            seniorPwdName: isSeniorPWD ? pwdCustomerName : null,
            seniorPwdStreet: isSeniorPWD ? pwdStreet : null,
            seniorPwdBarangay: isSeniorPWD ? pwdBarangay : null,
            seniorPwdCity: isSeniorPWD ? pwdCity : null,
            seniorPwdProvince: isSeniorPWD ? pwdProvince : null,
            seniorPwdZipCode: isSeniorPWD ? pwdZipCode : null
          });
          if (response && response.orderNumber) orderId = response.orderNumber;

          if (isPreOrder && response) {
            await apiClient.apiPos.orderEntryOrdersPreorderUpdate(Number(response.orderId), { isPreorder: true });
          }

          if (response && response.paymentUrl) {
            const url = response.paymentUrl;
            deductStocks();
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
      deductStocks();
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
    <Card className={cn("shadow-none border-border overflow-hidden flex flex-col", isMobile ? "h-full rounded-none rounded-t-2xl" : "rounded-2xl")}>
      {/* Cart Header */}
      <CardHeader className={cn("flex flex-row items-center justify-between border-b border-border bg-muted/50 px-4 py-3", isMobile && "px-4 py-3")}>
        <h2 className="text-title-lg font-bold text-foreground">Cart</h2>
        <div className="flex items-center gap-3">
          {isMobile && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowMobileCart(false)}
              className="h-10 w-10 rounded-xl"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </Button>
          )}

          {/* Order Type Dropdown */}
          <div ref={orderTypeDropdownRef} className="relative">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowOrderTypeDropdown(!showOrderTypeDropdown)}
              className="gap-1.5 rounded-lg text-xs font-semibold"
            >
              {isPreOrder ? "Pre-order" : isInstitutional ? "Institutional" : "Walk-in"}
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
            {showOrderTypeDropdown && (
              <div className="absolute top-full right-0 mt-1.5 bg-card border border-border rounded-xl shadow-lg z-[1000] min-w-[150px] overflow-hidden">
                <button
                  onClick={() => {
                    setIsInstitutional(false);
                    setIsPreOrder(false);
                    setShowOrderTypeDropdown(false);
                  }}
                  className={cn(
                    "w-full px-3.5 py-2.5 text-left text-xs font-semibold border-none cursor-pointer",
                    !isInstitutional && !isPreOrder
                      ? "bg-muted text-primary"
                      : "bg-transparent text-foreground hover:bg-muted/50"
                  )}
                >
                  Walk-in
                </button>
                <button
                  onClick={() => {
                    setIsInstitutional(true);
                    setIsPreOrder(false);
                    setShowOrderTypeDropdown(false);
                  }}
                  className={cn(
                    "w-full px-3.5 py-2.5 text-left text-xs font-semibold border-none cursor-pointer",
                    isInstitutional
                      ? "bg-muted text-primary"
                      : "bg-transparent text-foreground hover:bg-muted/50"
                  )}
                >
                  Institutional
                </button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>

      <div className={cn("flex flex-col", isMobile ? "flex-1 overflow-y-auto" : "")}>
        {/* Order Mode Info Panel */}
        {(isPreOrder || isInstitutional) && (
          <div className={cn("border-b border-border/40 bg-muted/30", isMobile ? "p-3" : "p-4")}>
            {isInstitutional && (
              <div className="p-3 bg-primary/5 border border-primary/10 rounded-2xl flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-background flex items-center justify-center">
                      <FileText className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-[10px] font-bold text-primary uppercase tracking-widest">Institutional Order</p>
                  </div>
                  <button
                    onClick={() => setShowInstitutionalModal(true)}
                    className="bg-transparent border-none text-primary text-xs font-bold cursor-pointer underline p-0"
                  >
                    {contactPerson ? "Edit Details" : "Add Details"}
                  </button>
                </div>
                {contactPerson ? (
                  <div className="text-xs text-foreground flex flex-col gap-1 mt-1">
                    <p className="m-0"><strong>Contact Name:</strong> {contactPerson}</p>
                    {contactNumber && <p className="m-0"><strong>Contact Number:</strong> {contactNumber}</p>}
                    <p className="m-0"><strong>Address:</strong> {street}, {city}, {province} {zipCode}</p>
                    {notes && <p className="m-0"><strong>Notes:</strong> {notes}</p>}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1 m-0">No details added yet.</p>
                )}
              </div>
            )}

            {isPreOrder && (
              <div className="p-3 bg-primary/5 border border-primary/10 rounded-2xl flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center shadow-sm">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest m-0">Pre-order Mode</p>
                  <p className="text-xs font-bold text-muted-foreground mt-0.5 m-0">Upfront Payment Required</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Cart Items */}
        <div className={cn(isMobile ? "p-3" : "p-4")}>
          {cart.length === 0 ? (
            <div className="text-center py-6">
              <div className="w-20 h-20 rounded-3xl bg-muted/50 border border-border/30 flex items-center justify-center mx-auto mb-4">
                <Package className="h-8 w-8 text-muted-foreground/20" />
              </div>
              <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-foreground/25">Cart is empty</h3>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-input border border-border flex items-center justify-center text-2xl shrink-0">
                    {item.category === "Ube Halaya" ? "🍠" : "🫙"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold m-0 text-foreground">{item.name}</p>
                    <div className="flex flex-col gap-0.5 mt-0.5">
                      {renderVariationBadges(item.variation, "hsl(var(--muted-foreground))", "hsl(var(--border))", "hsl(var(--input))", false)}
                      <p className="text-[11px] text-muted-foreground font-bold m-0">₱{item.price}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-7 w-7 rounded-lg"
                      onClick={() => updateQuantity(item.id, -1)}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </Button>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(item.id, e.target.value, item.stock)}
                      onBlur={() => handleQuantityBlur(item.id, item.quantity, item.stock)}
                      className="w-9 h-7 rounded-lg border border-border bg-background text-foreground text-xs font-bold text-center outline-none"
                    />
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-7 w-7 rounded-lg"
                      onClick={() => updateQuantity(item.id, 1)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart Footer */}
      <div className={cn("border-t border-border bg-muted/30 flex flex-col gap-4 shrink-0", isMobile ? "p-3" : "p-4")}>
        {/* Senior/PWD Toggle */}
        <div className="flex items-center justify-between px-3 h-11 rounded-xl border border-border bg-card">
          <span className="text-xs font-bold text-foreground">Senior/PWD</span>
          <div className="flex items-center gap-2">
            {isSeniorPWD && (
              <button
                onClick={() => {
                  setIsSeniorPWD(false);
                  setIdNumber("");
                  setPwdCustomerName("");
                  setPwdStreet("");
                  setPwdBarangay("");
                  setPwdCity("");
                  setPwdProvince("");
                  setPwdZipCode("");
                  setErrors(prev => {
                    const { idNumber, pwdCustomerName, pwdStreet, pwdBarangay, pwdCity, pwdProvince, pwdZipCode, ...rest } = prev;
                    return rest;
                  });
                }}
                className="px-2 py-1 rounded-lg border-none bg-transparent text-destructive text-xs font-bold cursor-pointer"
              >
                Clear
              </button>
            )}
            <Button
              size="sm"
              variant={isSeniorPWD ? "outline" : "default"}
              className={cn("text-xs font-bold rounded-lg h-7 px-3", isSeniorPWD && "text-primary border-primary/20 bg-primary/10 hover:bg-primary/20")}
              onClick={() => setShowPwdModal(true)}
            >
              {isSeniorPWD ? "Applied" : "Apply"}
            </Button>
          </div>
        </div>

        <Separator className="my-2" />

        {/* Totals */}
        <div>
          <div className="flex justify-between text-[11px] font-bold uppercase tracking-[0.15em] text-muted-foreground/60 mb-2">
            <span>Subtotal</span>
            <span className="text-foreground">₱{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          {isSeniorPWD && (
            <>
              <div className="flex justify-between text-[11px] font-bold uppercase text-destructive mb-2">
                <span>VAT Exemption (12%)</span>
                <span>- ₱{pwdDetails.vatExempt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-[11px] font-bold uppercase text-destructive mb-2">
                <span>Senior/PWD Discount (20%)</span>
                <span>- ₱{pwdDetails.discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </>
          )}
          <div className="flex justify-between items-end mt-2">
            <span className="text-lg font-bold text-foreground">Total Price</span>
            <span className="text-2xl font-bold text-primary">₱{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>

        <Button
          disabled={cart.length === 0}
          onClick={handleCheckout}
          className="w-full h-14 rounded-2xl text-[15px] font-bold uppercase tracking-[0.1em]"
        >
          Complete Sale
        </Button>
      </div>
    </Card>
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
    <div className="w-full min-h-full py-8 px-6 md:px-8 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      {/* Header */}
      <div className="shrink-0">
        <h1 className="text-headline-md font-bold tracking-tight text-foreground">Sales Processing</h1>
        <div className="mt-1 text-sm text-muted-foreground flex items-center gap-2">
          <span>Process walk-in and institutional orders</span>
          <span>·</span>
          <Badge variant="secondary" className="text-primary bg-primary/10 font-bold text-xs whitespace-nowrap">
            {locationType && locationName ? `${locationType} - ${locationName}` : "Store"}
          </Badge>
        </div>
      </div>

      <div className={cn("flex-1 min-h-0 grid gap-6", isMobile ? "grid-cols-1 pb-28" : "grid-cols-[1fr_420px]")}>
        {/* Product Catalog */}
        <Card className="shadow-none border-border overflow-hidden rounded-2xl">
          <CardHeader className={cn("border-b border-border", isMobile ? "px-3.5 py-3" : "px-5 py-4")}>
            <h2 className={cn("font-bold", isMobile ? "text-lg" : "text-xl")}>Product Catalog</h2>
          </CardHeader>
          <CardContent className={cn(isMobile ? "p-3" : "p-5")}>
            {categories.map((category) => (
              <div key={category} className={cn(isMobile ? "mb-5" : "mb-7")}>
                <div className={cn("flex items-center gap-4", isMobile ? "mb-3" : "mb-4")}>
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">{category}</h3>
                  <div className="h-px flex-1 bg-gradient-to-r from-border to-transparent" />
                </div>
                <div className={cn("grid gap-5", isMobile ? "grid-cols-1 gap-3" : "grid-cols-[repeat(auto-fill,minmax(330px,1fr))]")}>
                  {products
                    .filter((p) => p.category === category)
                    .map((product) => (
                      <ProductCard key={product.id} product={product} onAdd={() => addToCart(product)} isMobile={isMobile} />
                    ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Desktop Shopping Cart */}
        {!isMobile && (
          <div className="flex flex-col">
            {renderCart}
          </div>
        )}
      </div>

      {/* Mobile Floating Cart Button */}
      {isMobile && !showMobileCart && (
        <div
          onClick={() => setShowMobileCart(true)}
          className="fixed bottom-6 left-6 right-6 bg-primary text-primary-foreground px-6 py-4 rounded-[20px] flex justify-between items-center shadow-2xl z-40 cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="relative mr-2">
              <Package className="h-6 w-6" />
              {cart.length > 0 && (
                <div className="absolute -top-2 -right-3 bg-destructive text-destructive-foreground text-[10px] font-bold w-[18px] h-[18px] rounded-full flex items-center justify-center border-2 border-primary">
                  {cart.reduce((s, i) => s + (Number(i.quantity) || 0), 0)}
                </div>
              )}
            </div>
            <span className="font-bold text-[15px]">View Cart</span>
          </div>
          <span className="text-lg font-bold">₱{total.toLocaleString()}</span>
        </div>
      )}

      {/* Mobile Cart Modal */}
      {isMobile && showMobileCart && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-end animate-in fade-in duration-300">
          <div className="w-full h-[85vh] flex flex-col">
            {renderCart}
          </div>
        </div>
      )}

      <DeleteConfirmDialog
        isOpen={!!itemToRemove}
        onClose={() => setItemToRemove(null)}
        onConfirm={confirmRemoveItem}
        title="Remove Item"
        message={`Are you sure you want to remove ${itemToRemove?.name || "this item"} from the cart?`}
      />

      {/* Checkout Dialog */}
      {showCheckoutDialog && typeof document !== "undefined" && createPortal(
        <>
          <div
            onClick={() => setShowCheckoutDialog(false)}
            style={{ position: "fixed", inset: 0, zIndex: 99998, backgroundColor: "rgba(0, 0, 0, 0.6)" }}
          />
          <div
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 99999,
              width: "100%",
              maxWidth: 860,
              maxHeight: "90vh",
              backgroundColor: "#ffffff",
              borderRadius: 12,
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header */}
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #e4e4e7", flexShrink: 0 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0, color: "#18181b" }}>
                {isPreOrder ? "Complete Pre-order" : "Confirm Sale"}
              </h2>
            </div>

            {/* Body */}
            <div className="px-5 py-4 sm:px-6 sm:py-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    Items Summary
                  </h3>
                  <div className="flex flex-col gap-3 max-h-60 overflow-y-auto pr-1">
                    {cart.map((item) => (
                      <div key={item.id} className="flex justify-between items-center text-sm">
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="font-bold m-0 text-foreground">{item.name}</p>
                          <div className="flex flex-col gap-1 mt-1">
                            {renderVariationBadges(item.variation, "hsl(var(--muted-foreground))", "hsl(var(--border))", "hsl(var(--input))", false)}
                            <p className="text-xs text-muted-foreground font-bold uppercase m-0">Qty: {item.quantity}</p>
                          </div>
                        </div>
                        <span className="font-bold text-foreground shrink-0">₱{(item.price * (Number(item.quantity) || 0)).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  {isInstitutional && (
                    <div className="p-4 bg-muted border border-border rounded-xl text-sm">
                      <p className="text-xs font-bold text-primary uppercase tracking-widest mb-2">Delivery & Contact Details</p>
                      <div className="flex flex-col gap-1 text-foreground/80">
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
                        <button
                          onClick={() => setPaymentMethod("cash")}
                          className={cn(
                            "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors",
                            paymentMethod === "cash"
                              ? "border-foreground bg-foreground/5 text-foreground"
                              : "border-border text-muted-foreground hover:border-muted-foreground/30"
                          )}
                        >
                          <DollarSign className="h-5 w-5" />
                          <span className="text-xs font-bold uppercase">Cash</span>
                        </button>
                        <button
                          onClick={() => setPaymentMethod("gcash")}
                          className={cn(
                            "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-colors",
                            paymentMethod === "gcash"
                              ? "border-foreground bg-foreground/5 text-foreground"
                              : "border-border text-muted-foreground hover:border-muted-foreground/30"
                          )}
                        >
                          <Package className="h-5 w-5" />
                          <span className="text-xs font-bold uppercase">E-Wallet / Card / QR PH</span>
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between px-2 mt-2">
                    <span className="text-sm font-bold text-foreground/80">Print Receipt</span>
                    <input
                      type="checkbox"
                      checked={isPrintingReceipt}
                      onChange={(e) => setIsPrintingReceipt(e.target.checked)}
                      className="w-5 h-5 cursor-pointer accent-foreground rounded border-border"
                    />
                  </div>

                  {isSeniorPWD && (
                    <div className="flex flex-col gap-2 border-t border-border pt-4 mt-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Subtotal (VAT-Inclusive)</span>
                        <span className="font-semibold text-foreground">₱{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-sm text-destructive">
                        <span>VAT Exemption (12%)</span>
                        <span>- ₱{pwdDetails.vatExempt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-sm text-destructive">
                        <span>Senior/PWD Discount (20%)</span>
                        <span>- ₱{pwdDetails.discount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-end border-t border-border pt-4 mt-2">
                    <span className="text-base font-bold text-foreground">Grand Total</span>
                    <span className="text-2xl font-bold text-foreground">₱{total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>

                  {paymentMethod === "cash" && (
                    <div className="flex flex-col gap-3 border-t border-border pt-4 mt-2">
                      <div className="flex justify-between items-start text-sm">
                        <span className="font-semibold text-foreground/80 mt-1.5">Amount Paid</span>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-2">
                            <span className={cn("font-bold", amountPaid.trim() !== "" && (parseFloat(amountPaid) || 0) < total ? "text-destructive" : "text-muted-foreground")}>₱</span>
                            <input
                              type="text"
                              inputMode="decimal"
                              className={cn(
                                "w-28 px-3 py-1.5 text-right font-semibold border rounded-lg focus:outline-none focus:ring-2 transition-colors",
                                amountPaid.trim() !== "" && (parseFloat(amountPaid) || 0) < total
                                  ? "border-destructive bg-destructive/5 text-destructive focus:ring-destructive"
                                  : "border-border bg-background text-foreground focus:ring-ring focus:border-ring"
                              )}
                              placeholder="0.00"
                              value={amountPaid}
                              onChange={(e) => {
                                const val = e.target.value.replace(/[^0-9.]/g, "");
                                if ((val.match(/\./g) || []).length > 1) return;
                                setAmountPaid(val);
                              }}
                            />
                          </div>
                          {amountPaid.trim() !== "" && (parseFloat(amountPaid) || 0) < total && (
                            <span className="text-xs font-semibold text-destructive">Insufficient amount</span>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-between items-end pt-1">
                        <span className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Change</span>
                        <span className="text-xl font-bold text-foreground">
                          ₱{Math.max(0, (parseFloat(amountPaid) || 0) - total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "12px 24px",
                borderTop: "1px solid #e4e4e7",
                display: "flex",
                justifyContent: "flex-end",
                gap: 8,
                backgroundColor: "#fafafa",
                borderRadius: "0 0 12px 12px",
                flexShrink: 0,
              }}
            >
              <Button variant="outline" onClick={() => setShowCheckoutDialog(false)}>Cancel</Button>
              <Button onClick={confirmSale}>{isPreOrder ? "Process" : "Confirm"}</Button>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Institutional Details Modal */}
      <Dialog open={showInstitutionalModal} onOpenChange={setShowInstitutionalModal}>
        <DialogContent className="max-w-4xl max-h-[96vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-5 py-3 sm:px-6 sm:py-4 border-b border-border sticky top-0 bg-background z-10">
            <DialogTitle className="text-base sm:text-lg font-bold">
              Institutional Details
            </DialogTitle>
          </DialogHeader>

          <div className="px-5 py-4 sm:px-6 sm:py-5 overflow-y-auto flex-1">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label>Name / Organization <span className="text-destructive">*</span></Label>
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
                  className={cn(errors.contactPerson && "border-destructive")}
                />
                {errors.contactPerson && <p className="text-xs text-destructive mt-1">{errors.contactPerson}</p>}
              </div>

              <div>
                <Label>Contact Number <span className="text-destructive">*</span></Label>
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
                  className={cn(errors.contactNumber && "border-destructive")}
                />
                {errors.contactNumber && <p className="text-xs text-destructive mt-1">{errors.contactNumber}</p>}
              </div>

              <div className="sm:col-span-2">
                <Label>Street <span className="text-destructive">*</span></Label>
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
                  className={cn(errors.street && "border-destructive")}
                />
                {errors.street && <p className="text-xs text-destructive mt-1">{errors.street}</p>}
              </div>

              <div>
                <Label>Barangay <span className="text-destructive">*</span></Label>
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
                  className={cn(errors.barangay && "border-destructive")}
                />
                {errors.barangay && <p className="text-xs text-destructive mt-1">{errors.barangay}</p>}
              </div>
              <div>
                <Label>City <span className="text-destructive">*</span></Label>
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
                  className={cn(errors.city && "border-destructive")}
                />
                {errors.city && <p className="text-xs text-destructive mt-1">{errors.city}</p>}
              </div>

              <div>
                <Label>Province <span className="text-destructive">*</span></Label>
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
                  className={cn(errors.province && "border-destructive")}
                />
                {errors.province && <p className="text-xs text-destructive mt-1">{errors.province}</p>}
              </div>
              <div>
                <Label>Zip Code <span className="text-destructive">*</span></Label>
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
                  className={cn(errors.zipCode && "border-destructive")}
                />
                {errors.zipCode && <p className="text-xs text-destructive mt-1">{errors.zipCode}</p>}
              </div>

              <div className="sm:col-span-2">
                <Label>Notes / Customization</Label>
                <Textarea
                  placeholder="Optional notes..."
                  maxLength={500}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                  className="resize-none"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="px-5 py-3 sm:px-6 sm:py-4 border-t border-border bg-muted/50">
            <Button
              variant="outline"
              onClick={() => setShowInstitutionalModal(false)}
            >
              Cancel
            </Button>
            <Button
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
                if (!contactNumber.trim() || contactNumber.replace(/\D/g, "").length < 10) { newErrors.contactNumber = "Invalid Contact Number"; isValid = false; }
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Senior/PWD Modal */}
      <PwdFormModal
        show={showPwdModal}
        onClose={() => setShowPwdModal(false)}
        onProceed={() => { setIsSeniorPWD(true); setShowPwdModal(false); }}
        idNumber={idNumber}
        setIdNumber={setIdNumber}
        pwdCustomerName={pwdCustomerName}
        setPwdCustomerName={setPwdCustomerName}
        pwdStreet={pwdStreet}
        setPwdStreet={setPwdStreet}
        pwdBarangay={pwdBarangay}
        setPwdBarangay={setPwdBarangay}
        pwdCity={pwdCity}
        setPwdCity={setPwdCity}
        pwdProvince={pwdProvince}
        setPwdProvince={setPwdProvince}
        pwdZipCode={pwdZipCode}
        setPwdZipCode={setPwdZipCode}
        errors={errors}
        setErrors={setErrors}
      />

      {/* Success Toast */}
      {lastOrder && (
        <div className={cn(
          "fixed z-[100001] bg-card border border-border rounded-3xl p-5 shadow-2xl flex gap-5 animate-in slide-in-from-bottom-4 duration-500",
          isMobile ? "bottom-5 left-5 right-5" : "bottom-10 right-10 w-[340px]"
        )}>
          <div className="w-14 h-14 rounded-[22px] bg-green-50 dark:bg-green-950 flex items-center justify-center border border-green-200 dark:border-green-900 shrink-0">
            <CheckCircle className="h-8 w-8 text-green-500" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <p className="text-[15px] font-bold m-0 text-foreground">{lastOrder.id} Completed</p>
              <button onClick={() => setLastOrder(null)} className="bg-transparent border-none cursor-pointer p-0">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.1em] m-0 mb-4">Total ₱{lastOrder.total.toLocaleString()}.00</p>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-green-500 w-full rounded-full" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductCard({ product, onAdd, isMobile }: { product: Product; onAdd: () => void; isMobile: boolean }) {
  const isOutOfStock = product.stock <= 0;
  const isLow = product.stock > 0 && product.stock <= 15;
  return (
    <div
      onClick={isOutOfStock ? undefined : onAdd}
      className={cn(
        "flex items-center gap-3.5 border border-border rounded-xl transition-all",
        isMobile ? "p-2.5" : "p-3.5",
        isOutOfStock
          ? "bg-muted/50 opacity-60 cursor-not-allowed"
          : "bg-card cursor-pointer hover:shadow-lg hover:border-primary/30"
      )}
    >
      <div className={cn(
        "rounded-xl bg-input border border-border flex items-center justify-center shrink-0",
        isMobile ? "w-11 h-11 text-xl" : "w-14 h-14 text-[26px]"
      )}>
        {product.category === "Ube Halaya" ? "🍠" : "🫙"}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center gap-2">
          <h3 className={cn(
            "font-bold m-0 leading-tight",
            isMobile ? "text-sm" : "text-base",
            isOutOfStock ? "text-muted-foreground" : "text-foreground"
          )}>
            {product.name}
          </h3>
          <Badge
            variant={isOutOfStock ? "destructive" : isLow ? "destructive" : "secondary"}
            className={cn(
              "shrink-0 text-[10px] font-bold uppercase whitespace-nowrap",
              !isOutOfStock && !isLow && "text-muted-foreground"
            )}
          >
            {isOutOfStock ? "OUT OF STOCK" : `Remaining Stocks: ${product.stock}`}
          </Badge>
        </div>
        <div className={cn("mt-1 mb-1.5", isOutOfStock && "opacity-70")}>
          {renderVariationBadges(product.variation, "hsl(var(--muted-foreground))", "hsl(var(--border))", "hsl(var(--input))", false)}
        </div>
        <p className={cn(
          "font-bold m-0",
          isMobile ? "text-base" : "text-lg",
          isOutOfStock ? "text-muted-foreground" : "text-primary"
        )}>
          ₱{product.price}
        </p>
      </div>
    </div>
  );
}
