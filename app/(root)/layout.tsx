"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { AuthLayout, NavItem, GridIcon, UserIcon, PageIcon } from "@r3b2p/uilib";
import { Settings2, ListIcon, TableIcon } from "lucide-react";

const navItems: NavItem[] = [
  {
    icon: <GridIcon />,
    name: "Dashboard",
    path: "/",
  },
  {
    name: "Point of Sale",
    icon: <ListIcon />,
    app: "point-of-sale",
    baseUrl: process.env.NEXT_PUBLIC_POS_URL,
    subItems: [
      { name: "Sales Processing", path: "/sales-processing", app: "sales-processing", baseUrl: process.env.NEXT_PUBLIC_POS_URL },
      { name: "Order Management", path: "/order-management", app: "order-management", baseUrl: process.env.NEXT_PUBLIC_POS_URL },
    ],
  },
  {
    name: "Supply Chain",
    icon: <TableIcon />,
    app: "supply-chain",
    baseUrl: process.env.NEXT_PUBLIC_SCMS_URL,
    subItems: [
      { name: "Resources & Suppliers", path: "/resources-suppliers", app: "resources-suppliers", baseUrl: process.env.NEXT_PUBLIC_SCMS_URL },
      { name: "Orders and Procurement", path: "/orders-procurement", app: "orders-procurement", baseUrl: process.env.NEXT_PUBLIC_SCMS_URL },
      { name: "Inventory", path: "/inventory", app: "inventory", baseUrl: process.env.NEXT_PUBLIC_SCMS_URL },
      { name: "Production & Quality", path: "/production-quality", app: "production-quality", baseUrl: process.env.NEXT_PUBLIC_SCMS_URL },
      { name: "Distribution & Analytics", path: "/distribution-analytics", app: "distribution-analytics", baseUrl: process.env.NEXT_PUBLIC_SCMS_URL },
    ],
  },
  {
    name: "Customer Relation",
    icon: <PageIcon />,
    app: "customer-relation",
    baseUrl: process.env.NEXT_PUBLIC_CRMS_URL,
    subItems: [
      { name: "Customer Profiles", path: "/customers", app: "customers", baseUrl: process.env.NEXT_PUBLIC_CRMS_URL },
      { name: "Marketing & Promotions", path: "/marketing", app: "marketing", baseUrl: process.env.NEXT_PUBLIC_CRMS_URL },
      { name: "Support & Services", path: "/support", app: "support", baseUrl: process.env.NEXT_PUBLIC_CRMS_URL },
    ],
  },
  {
    name: "HR Management",
    icon: <UserIcon />,
    app: "hr-management",
    baseUrl: process.env.NEXT_PUBLIC_HRMS_URL,
    subItems: [
      { name: "Recruitment & Hiring", path: "/recruitment-hiring", app: "recruitment-hiring", baseUrl: process.env.NEXT_PUBLIC_HRMS_URL },
      { name: "Digital 201 Files", path: "/digital-201-file", app: "digital-201-file", baseUrl: process.env.NEXT_PUBLIC_HRMS_URL },
      { name: "Attendance & Biometrics", path: "/attendance-biometrics", app: "attendance-biometrics", baseUrl: process.env.NEXT_PUBLIC_HRMS_URL },
      { name: "Payroll & Deductions", path: "/payroll-deduction", app: "payroll-deduction", baseUrl: process.env.NEXT_PUBLIC_HRMS_URL },
      { name: "User Roles", path: "/user-roles", app: "user-roles", baseUrl: process.env.NEXT_PUBLIC_HRMS_URL },
    ],
  },
];

const othersItems: NavItem[] = [
  {
    icon: <Settings2 />,
    name: "Settings",
    app: "settings",
    baseUrl: process.env.NEXT_PUBLIC_HOST_URL,
    subItems: [
      { name: "User Management", path: "/users", app: "user-management", baseUrl: process.env.NEXT_PUBLIC_HOST_URL },
      { name: "IAM & Access Control", path: "/access-control", app: "iam", baseUrl: process.env.NEXT_PUBLIC_HOST_URL },
      { name: "Product Configuration", path: "/product-config", app: "product-config", baseUrl: process.env.NEXT_PUBLIC_HOST_URL },
    ],
  },
];

function RootLayoutInner({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(`${process.env.NEXT_PUBLIC_HOST_URL}/signin`);
    }
  }, [user, isLoading]);

  if (isLoading) return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  if (!user) return null;

  return (
    <AuthLayout
      navItems={navItems}
      othersItems={othersItems}
      user={user}
      onLogout={async () => {
        await logout();
        router.replace(`${process.env.NEXT_PUBLIC_HOST_URL}/signin`);
      }}
    >
      {children}
    </AuthLayout>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <RootLayoutInner>{children}</RootLayoutInner>
    </AuthProvider>
  );
}
