import InventoryTable from "../components/inventory-table/inventory-table";
import Layout from "../components/layout/layout";

export default async function InventoryPage() {
    return (
        <Layout>
            <InventoryTable />
        </Layout>
    );
}