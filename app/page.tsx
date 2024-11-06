import OrderTable from "./components/order-table/order-table";
import Layout from "./components/layout/layout";

export default async function Dashboard() {

    return (
        <Layout>
            <OrderTable />
        </Layout>
    );
}