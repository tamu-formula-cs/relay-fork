'use client';

import React, { useState, useMemo } from 'react';
import { SerializedOrderWithRelations } from '../order-table/order-table';
import styles from './backlog-component.module.css';
import useSWR, { mutate } from 'swr';
import Image from 'next/image';
import LinkIcon from "../../../assets/link.svg";
import { Item, ItemStatus, OrderStatus } from '@prisma/client';
import CloseIcon from "../../../assets/close.svg"
import EmptyIcon from "../../../assets/empty.svg"
import { useToast } from '../toast/use-toast';


interface Document {
    id: number;
    url: string;
    orderId: number;
    uploadedAt: string;
}

interface User {
    id: number;
    name: string;
    email: string;
    role: Role;
    subteam: string;
    createdAt: string;
    updatedAt: string;
}

enum Role {
    ENGINEER = 'ENGINEER',
    FINANCE = 'FINANCE',
    OPERATIONS = 'OPERATIONS',
    BUSINESS = 'BUSINESS',
}

interface Order {
    id: number;
    internalOrderId: string;
    meenOrderId: string | null;
    name: string;
    user: User;
    userId: number;
    subteam: string;
    status: OrderStatus;
    vendor: string;
    totalCost: number;
    costVerified: boolean;
    comments: string | null;
    url: string | null;
    carrier: string | null;
    trackingId: string | null;
    costBreakdown: Record<string, number> | null;
    createdAt: string;
    updatedAt: string;
    items: Item[];
    supportingDocs: Document[];
}

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
    const { toast } = useToast();

    const orders = useMemo(() => (data?.orders as SerializedOrderWithRelations[] || []), [data]);
    const [isMeenOrderIdModalOpen, setIsMeenOrderIdModalOpen] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

    // Orders to be Placed
    const ordersToBePlaced = useMemo(() => orders.filter(order => order.status === 'TO_ORDER'), [orders]);

    // Orders to be Picked Up
    const ordersWithDeliveredItems = useMemo(() => {
        // Only include orders that are not archived
        const nonArchivedOrders = orders.filter(order => order.status !== 'ARCHIVED');
        return nonArchivedOrders.filter(order => 
            order.status === 'DELIVERED' || 
            order.items.some(item => item.status === 'DELIVERED')
        );
    }, [orders]);

    // Separate state variables for each table
    const [expandedOrderIdsToBePlaced, setExpandedOrderIdsToBePlaced] = useState<number[]>([]);
    const [expandedOrderIdsToBePickedUp, setExpandedOrderIdsToBePickedUp] = useState<number[]>([]);

    const toggleExpandToBePlaced = (orderId: number, orderItems: Item[]) => {
        if (orderItems.length > 0) {
            setExpandedOrderIdsToBePlaced((prev) =>
                prev.includes(orderId)
                    ? prev.filter((id) => id !== orderId)
                    : [...prev, orderId]
            );
        }
    };

    const toggleExpandToBePickedUp = (orderId: number, orderItems: Item[]) => {
        if (orderItems.length > 0) {
            setExpandedOrderIdsToBePickedUp((prev) =>
                prev.includes(orderId)
                    ? prev.filter((id) => id !== orderId)
                    : [...prev, orderId]
            );
        }
    };

    const handleMarkOrder = (orderId: number) => {
        setSelectedOrderId(orderId);
        setIsMeenOrderIdModalOpen(true);
    };

    const handleMarkOrderAsPickedUp = async (orderId: number) => {
        try {
            const response = await fetch(`/api/orders/${orderId}/markPickedUp`, {
                method: 'POST',
            });
    
            if (response.ok) {
                // Update data
                mutate('/api/orders');
                toast({
                    title: "Order Picked Up",
                    description: "Order has been picked up.",
                    variant: "affirmation",
                });
            } else {
                toast({
                    title: "Update Failed",
                    description: "Failed to update order.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "An error occurred.",
                variant: "destructive",
            });
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
                toast({
                    title: "Item Picked Up",
                    description: "Item has been picked up.",
                    variant: "affirmation",
                });
            } else {
                toast({
                    title: "Update Failed",
                    description: "Failed to update item.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error(error);
            toast({
                title: "Error",
                description: "An error occurred.",
                variant: "destructive",
            });
        }
    };    

    if (error) {
        return <div>Error loading orders.</div>;
    }

    if (!data) {
        return <div>Loading orders...</div>;
    }

    const MeenOrderIdModal: React.FC<{ onClose: () => void; onSubmit: (meenOrderId: string) => void; }> = ({ onClose, onSubmit }) => {
        const [meenOrderId, setMeenOrderId] = useState('');
        const { toast } = useToast();
    
        const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            setMeenOrderId(e.target.value);
        };
    
        const handleSubmit = () => {
            if (meenOrderId.trim() === '') {
                toast({
                    title: "Missing MEEN Order ID",
                    description: "Please enter a MEEN Order ID.",
                    variant: "destructive",
                });
                return;
            }
            onSubmit(meenOrderId);
        };
    
        return (
            <div className={styles.overlay}>
                <div className={styles.settingsMenu}>
                    <div className={styles.formHeader}>
                        <h3 className={styles.formTitle}>Enter MEEN Order ID</h3>
                        <button className={styles.closeButton} onClick={onClose}>
                            <Image src={CloseIcon.src} height={10} width={10} alt='close'/>
                        </button>
                    </div>
                    <div className={styles.settingsGroup}>
                        <div className={styles.inputGroup}>
                            <label>MEEN Order ID:</label>
                            <input
                                type="text"
                                value={meenOrderId}
                                onChange={handleChange}
                                placeholder="Enter MEEN Order ID"
                            />
                        </div>
                    </div>
                    <div className={styles.buttonGroup}>
                        <button onClick={onClose} className={`${styles.cancelButton} ${styles.button}`}>
                            Cancel
                        </button>
                        <button onClick={handleSubmit} className={`${styles.saveButton} ${styles.button}`}>
                            Submit
                        </button>
                    </div>
                </div>
            </div>
        );
    };    


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
                                                    {order.supportingDocs.map((doc: Document, index:number) => (
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
                                        <tr key={`expanded-${order.id}`}>
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
                                        <tr key={`expanded-${order.id}`}>
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
                    <p>Everything&apos;s been picked up!</p>
                    <Image
                        src={EmptyIcon.src}
                        height={100}
                        width={100}
                        alt="No orders to pick up"
                    />
                </div>
            )}
            </div>
            {isMeenOrderIdModalOpen && selectedOrderId !== null && (
                <MeenOrderIdModal
                    onClose={() => setIsMeenOrderIdModalOpen(false)}
                    onSubmit={async (meenOrderId: string) => {
                        try {
                            const response = await fetch(`/api/orders/${selectedOrderId}/updateMeenOrderId`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ meenOrderId }),
                            });

                            if (response.ok) {
                                // Update local state
                                mutate('/api/orders');
                                setIsMeenOrderIdModalOpen(false);
                                toast({
                                    title: "Order Updated",
                                    description: "MEEN Order ID updated successfully.",
                                    variant: "affirmation",
                                });
                            } else {
                                toast({
                                    title: "Update Failed",
                                    description: "Failed to update order.",
                                    variant: "destructive",
                                });
                            }
                        } catch (error) {
                            console.error(error);
                            toast({
                                title: "Error",
                                description: "An error occurred.",
                                variant: "destructive",
                            });
                        }
                    }}
                />
            )}
        </div>
    );
};

export default BacklogComponent;