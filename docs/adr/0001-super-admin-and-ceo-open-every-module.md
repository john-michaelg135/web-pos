# Super Admin and CEO open every Module

**Status: superseded (2026-11-26).** Admin and CEO now follow the Enterprise Portal's Module grants like every other Role: the sidebar and the page guard show only the Modules the Portal granted them. They keep what their Role gives inside those Modules: every location and full rights.

The Enterprise Portal decides Module access per Staff member, but Super Admin and CEO are expected to open everything in POS, and a Portal grant list that drifts from POS's Module names would otherwise lock them out. POS therefore lets these two Roles open every Module once the Portal has told it their Role. The trade-off is that POS now trusts the Role for these two Roles instead of asking the Portal per Module; and because the Portal only reveals the Role alongside a granted Module, a Super Admin holding no Module at all still lands on `/no-access`.

Update (2026-11-26): the Enterprise Portal renamed the Super Admin Role to "Admin", so POS now matches "Admin" and "CEO". Matching the old name locked every Admin out of POS.

Superseded (2026-11-26): an Admin granted only the Dashboard saw every tab. Showing Modules the Portal did not grant made the Portal's access settings misleading, so POS now asks the Portal per Module for Admin and CEO too. The risk this ADR guarded against remains: if the Portal's Module names drift from POS's, an Admin or CEO loses those tabs until the names match again.
