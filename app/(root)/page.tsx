import { PageHeader } from "@/components/shared/PageHeader";
import UnderConstruction from "@/components/shared/under-construction";

const Page = () => {
  return (
    <div className="px-4 py-7 sm:px-8 dark:text-gray-400">
      <PageHeader title="Dashboard" subtitle="Your sales at a glance" />
      <UnderConstruction />
    </div>
  );
}

export default Page;
