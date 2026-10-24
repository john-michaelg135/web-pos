# POS

The point-of-sale app Bren Raphael's Staff use to sell, manage orders, products and stock, and read sales reports.

## Language

**Staff**:
A person who signs in through the Enterprise Portal and works in POS. The Enterprise Portal calls the same person a User. Never a Customer.
_Avoid_: User, admin

**Enterprise Portal**:
The central sign-in site that Staff sign in through and are sent into POS from. It decides who may open POS and which of its Modules. Signing out of POS signs the Staff member out of the Enterprise Portal and every other Bren Raphael's system.
_Avoid_: Portal (on its own), Auth app, login site

**Module**:
A feature area of POS that the Enterprise Portal grants or revokes per Staff member. The six are Dashboard, Sales Processing, Order Management, Product Management, Stock Management and Sales Reports. Each POS page belongs to exactly one Module, and a Staff member without a Module cannot open its pages or any page beneath them. Starting Cash and Locations belong to no Module.
_Avoid_: Permission, feature, role

**Role**:
The label the Enterprise Portal returns for a Staff member, such as Cashier, Manager or Super Admin. For most Roles it never decides Module access; only the Modules granted to that Staff member do. Super Admin and CEO are the exception: they open every Module and every page, whatever the Enterprise Portal granted. The two pages outside every Module are also decided by Role: Starting Cash opens for Cashier and Manager, and Locations for Manager only, and Super Admin and CEO open both.
_Avoid_: Permission group, access level
