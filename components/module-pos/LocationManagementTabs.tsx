import { TabsList, TabsTrigger } from "@/components/ui/tabs";
import { subtabClass, subtabListClass } from "@/components/ui/subtab-styles";

export function LocationManagementTabs() {
  return (
    <TabsList className={subtabListClass}>
      <TabsTrigger
        value="branches"
        className={subtabClass}
      >
        Branches
      </TabsTrigger>
      <TabsTrigger
        value="staff"
        className={subtabClass}
      >
        Staff Assignment
      </TabsTrigger>
    </TabsList>
  );
}
