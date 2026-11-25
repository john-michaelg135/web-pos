import { TabsList, TabsTrigger } from "@/components/ui/tabs";

export function LocationManagementTabs() {
  return (
    <TabsList className="h-auto bg-muted p-1 rounded-xl w-full sm:w-fit">
      <TabsTrigger
        value="branches"
        className="flex-1 sm:flex-none h-auto px-6 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
      >
        Branches
      </TabsTrigger>
      <TabsTrigger
        value="staff"
        className="flex-1 sm:flex-none h-auto px-6 py-2 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm"
      >
        Staff Assignment
      </TabsTrigger>
    </TabsList>
  );
}
