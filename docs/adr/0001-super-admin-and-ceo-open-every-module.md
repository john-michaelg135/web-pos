# Super Admin and CEO open every Module

The Enterprise Portal decides Module access per Staff member, but Super Admin and CEO are expected to open everything in POS, and a Portal grant list that drifts from POS's Module names would otherwise lock them out. POS therefore lets these two Roles open every Module once the Portal has told it their Role. The trade-off is that POS now trusts the Role for these two Roles instead of asking the Portal per Module; and because the Portal only reveals the Role alongside a granted Module, a Super Admin holding no Module at all still lands on `/no-access`.
