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
A feature area of POS that the Enterprise Portal grants or revokes per Staff member. The seven are Dashboard, Sales Processing, Order Management, Product Management, Stock Management, Sales Reports and Location Management. Each POS page belongs to exactly one Module, and a Staff member without a Module cannot open its pages or any page beneath them. Starting Cash belongs to no Module.
_Avoid_: Permission, feature, role

**Role**:
The label the Enterprise Portal returns for a Staff member, such as Cashier, Manager or Super Admin. For most Roles it never decides Module access; only the Modules granted to that Staff member do. Super Admin and CEO are the exception: they open every Module and every page, whatever the Enterprise Portal granted. The one page outside every Module, Starting Cash, is also decided by Role: it opens for Cashier, Manager, Super Admin and CEO.
_Avoid_: Permission group, access level

**Owner**:
The Staff member who owns the business: anyone whose Role is Super Admin or CEO. Only the Owner sees the Dashboard; every other Staff member is sent to their first Module instead, even if the Enterprise Portal granted them the Dashboard.
_Avoid_: Admin, superuser

**Dashboard**:
The Owner's view of the business at a glance: sales, orders, best sellers, branches and what needs attention. It holds no order numbers, product codes or other system detail.
_Avoid_: Home, overview

**Money Collected**:
The Dashboard's sales figure: every payment received (cash, GCash, downpayments, settled balances) minus approved refunds, counted on the day the money came in. A downpayment counts when it is received; the balance counts when it is confirmed.
_Avoid_: Sales, Revenue (on their own)

**Completed Sales**:
The Sales Report's sales figure: the full value of orders marked Completed, counted on the day the order was placed. An order counts only once it is Completed, so Paid orders waiting for delivery and downpayments are not in it yet. It will differ from Money Collected for the same days, and that is expected.
_Avoid_: Sales, Revenue (on their own)

**Business day**:
A calendar day in Philippine time (UTC+8). The Dashboard, the Sales Report and Starting Cash all count days this way, whatever time zone the device is in.
