'use client';

import React, { useState, useMemo } from 'react';
import { SerializedOrderWithRelations } from '../order-table/order-table';
import styles from './backlog-component.module.css';
import useSWR, { mutate } from 'swr';
import Image from 'next/image';
import LinkIcon from "../../../assets/link.svg";
import { ItemStatus, OrderStatus } from '@prisma/client';
import EmptyIcon from "../../../assets/empty.svg"

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const subteamMapping: { [key: string]: string } = {
    AERO: 'Aerodynamics',
    CHS: 'Chassis',
    BAT: 'Battery',
    ECE: 'Electronics',
    PT: 'Powertrain',
    SUS: 'Suspension',
    Operations: 'Operations',
};

const BacklogComponent: React.FC = () => {
    const { data, error } = useSWR('/api/orders', fetcher, { refreshInterval: 60000 });

    const orders = useMemo(() => (data?.orders as SerializedOrderWithRelations[] || []), [data]);

    // Orders to be Placed
    const ordersToBePlaced = useMemo(() => orders.filter(order => order.status === 'TO_ORDER'), [orders]);

    // Orders to be Picked Up
    const ordersWithDeliveredItems = useMemo(() => {
        // Only include orders that are not archived
        const nonArchivedOrders = orders.filter(order => order.status !== 'ARCHIVED');
        return nonArchivedOrders.filter(order => order.items.some(item => item.status === 'DELIVERED'));
    }, [orders]);

    // Separate state variables for each table
    const [expandedOrderIdsToBePlaced, setExpandedOrderIdsToBePlaced] = useState<number[]>([]);
    const [expandedOrderIdsToBePickedUp, setExpandedOrderIdsToBePickedUp] = useState<number[]>([]);

    const toggleExpandToBePlaced = (orderId: number, orderItems: any[]) => {
        if (orderItems.length > 0) {
            setExpandedOrderIdsToBePlaced((prev) =>
                prev.includes(orderId)
                    ? prev.filter((id) => id !== orderId)
                    : [...prev, orderId]
            );
        }
    };

    const toggleExpandToBePickedUp = (orderId: number, orderItems: any[]) => {
        if (orderItems.length > 0) {
            setExpandedOrderIdsToBePickedUp((prev) =>
                prev.includes(orderId)
                    ? prev.filter((id) => id !== orderId)
                    : [...prev, orderId]
            );
        }
    };

    const handleMarkOrder = async (orderId: number) => {
        const meenOrderId = prompt('Enter the MEEN Order ID:');
        if (!meenOrderId) return;

        try {
            const response = await fetch(`/api/orders/${orderId}/updateMeenOrderId`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ meenOrderId }),
            });

            if (response.ok) {
                // Update local state
                mutate('/api/orders');
            } else {
                alert('Failed to update order.');
            }
        } catch (error) {
            console.error(error);
            alert('An error occurred.');
        }
    };

    const handleMarkOrderAsPickedUp = async (orderId: number) => {
        try {
            const response = await fetch(`/api/orders/${orderId}/markPickedUp`, {
                method: 'POST',
            });

            if (response.ok) {
                // Update data
                mutate('/api/orders');
            } else {
                alert('Failed to update order.');
            }
        } catch (error) {
            console.error(error);
            alert('An error occurred.');
        }
    };

    const handleMarkItem = async (itemId: number) => {
        try {
            const response = await fetch(`/api/items/${itemId}/markPickedUp`, {
                method: 'POST',
            });

            if (response.ok) {
                // Update data
                mutate('/api/orders');
            } else {
                alert('Failed to update item.');
            }
        } catch (error) {
            console.error(error);
            alert('An error occurred.');
        }
    };

    if (error) {
        return <div>Error loading orders.</div>;
    }

    if (!data) {
        return <div>Loading orders...</div>;
    }

    return (
        <div className={styles.tableMainContainer}>
            {/* Orders to be Placed Section */}
            <div className={styles.section}>
                <h1 className={styles.purchaseHeader}>Orders to be Placed</h1>
                <div className={styles.tableContainer}>
                    <table className={styles.tableBody}>
                        <thead className={styles.tableHeader}>
                            <tr>
                                <th className={`${styles.thText} ${styles.datePlacedColumn}`}>Date Placed</th>
                                <th className={`${styles.thText}`}>Name</th>
                                <th className={`${styles.thText} ${styles.vendorColumn}`}>Vendor</th>
                                <th className={`${styles.thText} ${styles.linkColumn}`}>Link</th>
                                <th className={`${styles.thText} ${styles.priceColumn}`}>Price</th>
                                <th className={`${styles.thText} ${styles.subteamColumn}`}>Subteam</th>
                                <th className={`${styles.thText}`}>Cost Breakdown</th>
                                <th className={`${styles.thText} ${styles.documentsColumn}`}>Documents</th>
                                <th className={`${styles.thText}`}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ordersToBePlaced.map((order) => (
                                <React.Fragment key={order.id}>
                                    <tr
                                        onClick={() => toggleExpandToBePlaced(order.id, order.items)}
                                        className={styles.order}
                                    >
                                        <td className={`${styles.tdText} ${styles.textColumn}`}>
                                            {new Date(order.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className={`${styles.tdText} ${styles.nameColumn}`}>
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
                                        <td className={`${styles.tdText} ${styles.textColumn}`}>
                                            {order.user.subteam}
                                        </td>
                                        <td className={`${styles.tdText} ${styles.costBreakdownColumn}`}>
                                            {order.costBreakdown ? (
                                                <div className={styles.costBreakdownText}>
                                                    {Object.entries(order.costBreakdown)
                                                        .filter(([, percentage]) => percentage as number > 0)
                                                        .map(([subteam, percentage]) => (
                                                            <div key={subteam} className={styles.breakdownItem}>
                                                                {Object.keys(subteamMapping).find(key => subteamMapping[key] === subteam) || subteam}: {percentage as number}%
                                                            </div>
                                                        ))}
                                                </div>
                                            ) : (
                                                'N/A'
                                            )}
                                        </td>
                                        <td className={`${styles.tdText} ${styles.documentsColumn}`}>
                                            {order.supportingDocs && order.supportingDocs.length > 0 ? (
                                                <div className={styles.docsContainer}>
                                                    {order.supportingDocs.map((doc, index) => (
                                                        <a
                                                            key={index}
                                                            href={doc.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className={styles.docLink}
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            <span className={styles.docIcon}>📄</span>
                                                            <span className={styles.docName}>{doc.url.split('/').pop()}</span>
                                                        </a>
                                                    ))}
                                                </div>
                                            ) : (
                                                'N/A'
                                            )}
                                        </td>
                                        <td className={`${styles.tdText}`}>
                                            <button
                                                className={styles.markOrderButton}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleMarkOrder(order.id);
                                                }}
                                            >
                                                Mark Order
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedOrderIdsToBePlaced.includes(order.id) && (
                                        <tr>
                                            <td colSpan={8}>
                                            <div className={styles.expandedOrder}>
                                                {order.items.map((item) => (
                                                    <div key={item.id} className={styles.expandedOrderContent}>
                                                        <div className={styles.itemLeftCol}>
                                                            <h4>
                                                                {item.link ? (
                                                                    <a
                                                                        href={item.link}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        onClick={(e) => e.stopPropagation()} // Prevents the row click event
                                                                        className={styles.itemNameLink}
                                                                    >
                                                                        {item.name.length > 21
                                                                            ? item.name.slice(0, 21) + '...'
                                                                            : item.name}
                                                                    </a>
                                                                ) : (
                                                                    item.name.length > 21
                                                                        ? item.name.slice(0, 21) + '...'
                                                                        : item.name
                                                                )}
                                                            </h4>
                                                            <p>{item.vendor}</p>
                                                            <p>${item.price.toFixed(2)}</p>
                                                        </div>
                                                        <div className={styles.placedItemRightCol}>
                                                            <p>PN: {item.partNumber ? item.partNumber : "N/A"}</p>
                                                            <p>Q: {item.quantity}</p>
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
                {ordersToBePlaced.length === 0 && (
                <div className={styles.emptyState}>
                    <p>No orders to place right now. 🌟</p>
                    <p>All set on the ordering front!</p>
                    <Image
                        src={EmptyIcon.src}
                        height={100}
                        width={100}
                        alt="No orders to place"
                    />
                </div>
            )}
            </div>

            {/* Orders to be Picked Up Section */}
            <div className={styles.section}>
                <h1 className={styles.purchaseHeader}>Orders to be Picked Up</h1>
                <div className={styles.tableContainer}>
                    <table className={styles.tableBody}>
                        <thead className={styles.tableHeader}>
                            <tr>
                                <th className={`${styles.thText} ${styles.datePlacedColumn}`}>Date Placed</th>
                                <th className={`${styles.thText}`}>Name</th>
                                <th className={`${styles.thText} ${styles.vendorColumn}`}>Vendor</th>
                                <th className={`${styles.thText} ${styles.linkColumn}`}>Link</th>
                                <th className={`${styles.thText}`}>Status</th> {/* New Status Column */}
                                <th className={`${styles.thText} ${styles.subteamColumn}`}>Subteam</th>
                                <th className={`${styles.thText}`}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {ordersWithDeliveredItems.map((order) => (
                                <React.Fragment key={order.id}>
                                    <tr
                                        onClick={() => toggleExpandToBePickedUp(order.id, order.items)}
                                        className={styles.order}
                                    >
                                        <td className={`${styles.tdText} ${styles.textColumn}`}>
                                            {new Date(order.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className={`${styles.tdText} ${styles.nameColumn}`}>
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
                                        <td
                                            className={`${styles.tdText} ${
                                                order.status === OrderStatus.TO_ORDER
                                                    ? styles.orderStatusToOrder
                                                    : order.status === OrderStatus.PLACED
                                                    ? styles.orderStatusPlaced
                                                    : order.status === OrderStatus.PROCESSED
                                                    ? styles.orderStatusProcessed
                                                    : order.status === OrderStatus.PARTIAL
                                                    ? styles.orderStatusPartial
                                                    : order.status === OrderStatus.DELIVERED
                                                    ? styles.orderStatusDelivered
                                                    : styles.orderStatusShipped
                                            } ${styles.statusColumn}`}
                                        >
                                            {order.status.toUpperCase()}
                                        </td>
                                        <td className={`${styles.tdText} ${styles.textColumn}`}>
                                            {order.user.subteam}
                                        </td>
                                        <td className={`${styles.tdText}`}>
                                            <button
                                                className={styles.markOrderButton}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleMarkOrderAsPickedUp(order.id);
                                                }}
                                            >
                                                Mark Order
                                            </button>
                                        </td>
                                    </tr>
                                    {expandedOrderIdsToBePickedUp.includes(order.id) && (
                                        <tr>
                                            <td colSpan={7}>
                                                <div className={styles.expandedOrder}>
                                                    {order.items.map((item) => (
                                                        <div
                                                            key={item.id}
                                                            className={styles.expandedOrderContent}
                                                        >
                                                            <div className={styles.itemLeftCol}>
                                                                <h4>
                                                                    {item.name.length > 18
                                                                        ? item.name.slice(0, 18) + '...'
                                                                        : item.name}
                                                                </h4>
                                                                <p>{item.vendor}</p>
                                                                <p>${item.price.toFixed(2)}</p>
                                                            </div>
                                                            <div className={styles.itemRightCol}>
                                                                <p
                                                                    className={`${styles.itemStatusText} ${
                                                                        item.status === ItemStatus.TO_ORDER
                                                                            ? styles.itemStatusToOrder
                                                                            : item.status === ItemStatus.PLACED
                                                                            ? styles.orderStatusPlaced
                                                                            : item.status === ItemStatus.PROCESSED
                                                                            ? styles.orderStatusProcessed
                                                                            : item.status === ItemStatus.DELIVERED
                                                                            ? styles.itemStatusDelivered
                                                                            : item.status === ItemStatus.PICKED_UP
                                                                            ? styles.itemStatusPickedUp
                                                                            : styles.itemStatusShipped
                                                                    } ${styles.itemStatus}`}                                                                    
                                                                >
                                                                    {item.status.toUpperCase()}
                                                                </p>
                                                                {item.status === ItemStatus.DELIVERED && (
                                                                    <button
                                                                        className={styles.markItemButton}
                                                                        onClick={() => handleMarkItem(item.id)}
                                                                    >
                                                                        Mark Item
                                                                    </button>
                                                                )}
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
                {ordersWithDeliveredItems.length === 0 && (
                <div className={styles.emptyState}>
                    <p>No pending pickups. 🚚</p>
                    <p>Everything's been picked up!</p>
                    <Image
                        src={EmptyIcon.src}
                        height={100}
                        width={100}
                        alt="No orders to pick up"
                    />
                </div>
            )}
            </div>
        </div>
    );
};

export default BacklogComponent;