'use client';

import React, { useState, useMemo, useEffect } from 'react';
import styles from './order-table.module.css';
import OrderForm from '../order-form/order-form';
import { Item, ItemStatus, OrderStatus } from '@prisma/client';
import SettingsMenu from '../settings-component/settings';
import Settings from "../../../assets/settings.svg";
import LinkIcon from "../../../assets/link.svg";
import EmptyIcon from "../../../assets/empty.svg";
import SortIcon from "../../../assets/sort.svg"
import Image from 'next/image';
import useSWR, { mutate } from 'swr';
import { useSession } from 'next-auth/react';

interface CostBreakdown {
    [key: string]: number;
}


interface Document {
    id: number;
    url: string;
    orderId: number;
    uploadedAt: string;
}

export interface SerializedOrderWithRelations {
    subteam: string;
    supportingDocs: Document[];
    id: number;
    internalOrderId: string;
    meenOrderId: string | null;
    name: string;
    userId: number;
    status: OrderStatus;
    vendor: string;
    totalCost: number;
    costVerified: boolean;
    comments: string | null;
    url: string | null;
    carrier: string | null;
    trackingId: string | null;
    costBreakdown: CostBreakdown | null;
    createdAt: Date | string;
    updatedAt: Date;
    user: {
        id: number;
        name: string;
        email: string;
        subteam: string;
        role: string;
        createdAt: string;
        updatedAt: Date;
    };
    items: {
        id: number;
        internalItemId: string;
        orderId: number;
        name: string;
        partNumber: string;
        notes: string | null;
        quantity: number;
        price: number;
        priceVerified: boolean;
        vendor: string;
        link: string | null;
        status: ItemStatus;
        createdAt: Date;
        updatedAt: Date;
    }[];
}

const subteamMapping: { [key: string]: string } = {
    AERO: 'Aerodynamics',
    CHS: 'Chassis',
    SUS: 'Suspension',
    BAT: 'Battery',
    ECE: 'Electronics',
    PT: 'Powertrain',
    DBMS: 'Distributed BMS',
    OPS: 'Operations',
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const OrderTable: React.FC = () => {

    useEffect(() => {
        const eventSource = new EventSource('/api/notifications');
        eventSource.onmessage = (event) => {
            const updatedOrder = JSON.parse(event.data);
            console.log('Order updated:', updatedOrder);
            mutate('/api/orders');
        };
        eventSource.onerror = (error) => {
            console.error('EventSource error:', error);
            eventSource.close();
        };
    
        return () => {
            eventSource.close();
        };
    }, [])
    
    const [expandedOrderIds, setExpandedOrderIds] = useState<number[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showOrderForm, setShowOrderForm] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<SerializedOrderWithRelations | null>(null);
    const [selectedItem, setSelectedItem] = useState<Item | undefined>(undefined);
    const [showSettingsMenu, setShowSettingsMenu] = useState<boolean>(false);
    const [sortedColumn, setSortedColumn] = useState<string | null>(null);
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

    const { data: session } = useSession();
    const currentUserSubteam = session ? session?.user.subteam : "";

    const { data, error } = useSWR('/api/orders', fetcher, { refreshInterval: 60000 });

    const orders = useMemo(() => (data?.orders as SerializedOrderWithRelations[] || []).filter(order => order.status !== 'ARCHIVED'), [data]);

    const handleSort = (column: string) => {
        if (sortedColumn === column) {
            // Toggle sort order if the same column is clicked
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            // Set new column and default to ascending order
            setSortedColumn(column);
            setSortOrder('asc');
        }
    };

    const filteredOrders = useMemo(() => {
        let result = orders;

        if (searchQuery !== '') {
            const query = searchQuery.toLowerCase();
            result = result.filter((order) => {
                // Get subteams involved in the cost breakdown
                const involvedSubteams = Object.keys(order.costBreakdown || {}).filter(
                    (subteam) => (order.costBreakdown![subteam] || 0) > 0
                );
    
                // Map subteam acronyms to full names
                const subteamNames = involvedSubteams.map((acronym) => ({
                    acronym: acronym.toLowerCase(),
                    fullName: (subteamMapping[acronym] || '').toLowerCase(),
                }));
    
                // Check if the query matches any subteam acronym or full name
                const matchesCostBreakdown = subteamNames.some(
                    ({ acronym, fullName }) =>
                        acronym.includes(query) || fullName.includes(query)
                );
    
                return (
                    order.name.toLowerCase().includes(query) ||
                    order.vendor.toLowerCase().includes(query) ||
                    order.status.toLowerCase().includes(query) ||
                    order.user.subteam.toLowerCase().includes(query) ||
                    (order.comments && order.comments.toLowerCase().includes(query)) ||
                    matchesCostBreakdown ||
                    order.items.some((item) =>
                        item.name.toLowerCase().includes(query) ||
                        item.vendor.toLowerCase().includes(query) ||
                        item.status.toLowerCase().includes(query)
                    )
                );
            });
        }

        if (sortedColumn) {
            result = result.slice().sort((a, b) => {
                let aValue = 0;
                let bValue = 0;
                if (sortedColumn === 'datePlaced') {
                    aValue = new Date(a.createdAt).getTime();
                    bValue = new Date(b.createdAt).getTime();
                } else if (sortedColumn === 'price') {
                    aValue = a.totalCost;
                    bValue = b.totalCost;
                }
                if (sortOrder === 'asc') {
                    return aValue - bValue;
                } else {
                    return bValue - aValue;
                }
            });
        }

        return result;
    }, [orders, searchQuery, sortedColumn, sortOrder]);

    const handleSettingsClick = (order: SerializedOrderWithRelations, item?: Item) => {
        if (item) {
            setSelectedItem(item);
        } else {
            setSelectedOrder(order);
        }
        setShowSettingsMenu(true);
    };

    const handleCloseSettingsMenu = () => {
        setSelectedOrder(null);
        setSelectedItem(undefined);
        setShowSettingsMenu(false);
    };

    const updateOrderInState = () => {
        mutate('/api/orders');
    };

    const toggleExpand = (orderId: number, orderItems: Item[], orderUrl: string | null) => {
        if (orderItems.length === 0 && orderUrl) {
            // Do nothing
        } else if (orderItems.length > 0) {
            // If there are items, toggle the expansion
            setExpandedOrderIds((prev) =>
                prev.includes(orderId)
                    ? prev.filter((id) => id !== orderId)
                    : [...prev, orderId]
            );
        }
    };

    if (error) {
        return <div>Error loading orders.</div>;
    }

    if (!data) {
        return <div>Loading orders...</div>;
    }

    const handleStatusClick = (event: React.MouseEvent, order : SerializedOrderWithRelations) => {
        event.stopPropagation();

        if (order.carrier === "FEDEX" && order.trackingId) {
            window.open(`https://www.fedex.com/fedextrack/?trknbr=${order.trackingId}`, '_blank');
        } else if (order.carrier === "UPS" && order.trackingId) {
            window.open(`https://www.ups.com/track?loc=en_US&tracknum=${order.trackingId}&requester=WT/trackdetails`, '_blank');
        }
    };

    return (
        <div className={styles.tableMainContainer}>
            <div className={styles.tableTop}>
                <h1 className={styles.purchaseHeader}>Purchase Orders</h1>
                <div className={styles.tableSearch}>
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={styles.searchBar}
                    />
                    
                    <button
                        className={styles.myOrdersButton}
                        onClick={() => setSearchQuery(currentUserSubteam.toLowerCase())}
                    >
                        My Orders
                    </button>
                    
                    <button
                        className={styles.orderButton}
                        onClick={() => setShowOrderForm(true)}
                    >
                        Place Order
                    </button>
                </div>
            </div>
            {showOrderForm && <OrderForm onClose={() => setShowOrderForm(false)} />}
            {showSettingsMenu && (
                <SettingsMenu
                    order={selectedOrder}
                    item={selectedItem}
                    onClose={handleCloseSettingsMenu}
                    onUpdateOrder={updateOrderInState}
                />
            )}
            <div className={styles.tableContainer}>
                <table className={styles.tableBody}>
                    <thead className={styles.tableHeader}>
                        <tr>
                            <th className={`${styles.thText} ${styles.idColumn}`}>ID</th>
                            <th
                                className={`${styles.thText} ${styles.datePlacedColumn} ${styles.sortableHeader}`}
                                onClick={() => handleSort('datePlaced')}
                            >
                                <span>Date Placed</span>
                                <Image
                                    src={SortIcon.src}
                                    height={10}
                                    width={10}
                                    alt="Sort Icon"
                                    className={`${styles.sortIcon} ${sortedColumn === 'datePlaced' && sortOrder === 'desc' ? styles.desc : styles.asc}`}
                                />
                            </th>
                            <th className={`${styles.thText}`}>Name</th>
                            <th className={`${styles.thText} ${styles.vendorColumn}`}>Vendor</th>
                            <th className={`${styles.thText} ${styles.linkColumn}`}>Link</th>
                            <th
                                className={`${styles.thText} ${styles.priceColumn} ${styles.sortableHeader}`}
                                onClick={() => handleSort('price')}
                            >
                                <span>Price</span>
                                <Image
                                    src={SortIcon.src}
                                    height={10}
                                    width={10}
                                    alt="Sort Icon"
                                    className={`${styles.sortIcon} ${sortedColumn === 'price' && sortOrder === 'desc' ? styles.desc : styles.asc}`}
                                />
                            </th>
                            <th className={`${styles.thText} ${styles.statusColumn}`}>Status</th>
                            <th className={`${styles.thText} ${styles.subteamColumn}`}>Subteam</th>
                            <th className={`${styles.thText} ${styles.commentsColumnHeader} ${styles.commentsColumn}`}>Comments</th>
                            <th className={`${styles.settingsCellHeader} ${styles.settingsColumn}`}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.map((order) => (
                            <React.Fragment key={order.id}>
                                <tr
                                    onClick={() => toggleExpand(order.id, order.items, order.url)}
                                    className={styles.order}
                                >
                                    <td className={`${styles.tdText} ${styles.idColumn}`}>
                                        {order.meenOrderId ? "#" + order.meenOrderId : "N/A"}
                                    </td>
                                    <td className={`${styles.tdText} ${styles.textColumn}`}>
                                        {new Date(order.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className={`${styles.tdText} ${styles.nameColumn} ${styles.nameColumn}`}>
                                        {order.name}
                                    </td>
                                    <td className={`${styles.tdText} ${styles.textColumn} ${styles.vendorColumn}`}>
                                        {order.vendor}
                                    </td>
                                    <td className={`${styles.tdText} ${styles.textColumn}`}>
                                        {order.url ? (
                                            <button
                                                className={styles.linkButton}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(order.url!, '_blank');
                                                }}
                                            >
                                                <Image
                                                    src={LinkIcon.src}
                                                    height={15}
                                                    width={15}
                                                    alt="link"
                                                />
                                            </button>
                                        ) : (
                                            'N/A'
                                        )}
                                    </td>
                                    <td className={`${styles.tdText} ${styles.textColumn} ${styles.priceColumn}`}>
                                        ${order.totalCost.toFixed(2)}{' '}
                                        {order.costVerified && (
                                            <span className={styles.checkMark}>✓</span>
                                        )}
                                    </td>
                                    <td
                                        className={`${styles.tdText} ${
                                            order.status === OrderStatus.TO_ORDER
                                                ? styles.orderStatusToOrder
                                                : order.status === OrderStatus.PLACED
                                                ? styles.orderStatusPlaced
                                                : order.status === OrderStatus.PROCESSED
                                                ? styles.orderStatusProcessed
                                                : order.status === OrderStatus.DELIVERED
                                                ? styles.orderStatusDelivered
                                                : order.status === OrderStatus.PARTIAL
                                                ? styles.orderStatusPartial
                                                : styles.orderStatusShipped
                                        }`}
                                        onClick={(event)=>handleStatusClick(event, order)}
                                    >
                                        {order.status.toUpperCase()}
                                    </td>
                                    <td className={`${styles.tdText} ${styles.costBreakdownColumn}`}>
                                        {order.costBreakdown ? (
                                            <div className={styles.costBreakdownText}>
                                                {Object.entries(order.costBreakdown)
                                                    .filter(([, percentage]) => percentage > 0)
                                                    .map(([subteam, percentage]) => (
                                                        <div key={subteam} className={styles.breakdownItem}>
                                                            {subteam}: {percentage}%
                                                        </div>
                                                    ))}
                                            </div>
                                        ) : (
                                            'N/A'
                                        )}
                                    </td>
                                    <td className={`${styles.tdText} ${styles.commentsColumn}`}>
                                        {order.comments || 'N/A'}
                                    </td>
                                    <td
                                        className={styles.settingsCell}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <button
                                            className={styles.settingsButton}
                                            onClick={() => handleSettingsClick(order)}
                                        >
                                            <Image
                                                src={Settings.src}
                                                height={15}
                                                width={15}
                                                alt="settings"
                                            />
                                        </button>
                                    </td>
                                </tr>
                                {expandedOrderIds.includes(order.id) && (
                                    <tr>
                                        <td colSpan={10}>
                                            <div className={styles.expandedOrder}>
                                                {order.items.map((item) => (
                                                    <div
                                                        key={item.id}
                                                        className={styles.expandedOrderContent}
                                                    >
                                                        <div className={styles.itemLeftCol}>
                                                            <h4>
                                                                {item.name.length > 21
                                                                    ? item.name.slice(0, 21) + '...'
                                                                    : item.name}
                                                            </h4>
                                                            <p>{item.vendor}</p>
                                                            <p>${item.price.toFixed(2)}</p>
                                                        </div>
                                                        <div className={styles.itemRightCol}>
                                                            <p
                                                                className={`${styles.itemStatusText} ${
                                                                    item.status === ItemStatus.TO_ORDER
                                                                        ? styles.orderStatusToOrder
                                                                        : item.status === ItemStatus.PLACED
                                                                        ? styles.orderStatusPlaced
                                                                        : item.status === ItemStatus.PROCESSED
                                                                        ? styles.orderStatusProcessed
                                                                        : item.status === ItemStatus.DELIVERED
                                                                        ? styles.itemStatusDelivered
                                                                        : styles.orderStatusShipped
                                                                } ${styles.itemStatus}`}
                                                            >
                                                                {item.status.toUpperCase()}
                                                            </p>
                                                            <button
                                                                className={styles.itemSettingsButton}
                                                                onClick={() => handleSettingsClick(order, item)}
                                                            >
                                                                <Image src={Settings.src} height={15} width={15} alt="settings" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
            {filteredOrders.length === 0 && (
            <div className={styles.emptyState}>
                <p>No active orders at the moment. 🎉</p>
                <p>Looks like everything is all set!</p>
                <Image
                    src={EmptyIcon.src}
                    height={100}
                    width={100}
                    alt="No orders"
                />
            </div>
        )}
        </div>
    );
};

export default OrderTable;
