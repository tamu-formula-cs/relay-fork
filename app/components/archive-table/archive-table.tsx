"use client";

import React, { useState, useMemo } from 'react';
import styles from './archive-table.module.css';
import { OrderStatus, Item } from '@prisma/client';
import SettingsMenu from '../settings-component/settings';
import Settings from "../../../assets/settings.svg";
import LinkIcon from "../../../assets/link.svg";
import EmptyIcon from "../../../assets/empty.svg"
import Image from 'next/image';
import { SerializedOrderWithRelations } from '../order-table/order-table';
import useSWR, { mutate } from 'swr';

const fetcher = async (url: string) => {
    const res = await fetch(url);
    const data = await res.json();
  
    // Process data.orders to convert date strings to Date objects
    const orders = data.orders.map((order: SerializedOrderWithRelations) => ({
      ...order,
      createdAt: new Date(order.createdAt),
      updatedAt: new Date(order.updatedAt),
      items: order.items.map((item) => ({
        ...item,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
      })),
      user: {
        ...order.user,
        createdAt: new Date(order.user.createdAt),
        updatedAt: new Date(order.user.updatedAt),
      },
    }));
  
    return { orders };
  };
  

const ArchiveTable: React.FC = () => {
    const [expandedOrderIds, setExpandedOrderIds] = useState<number[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<SerializedOrderWithRelations | null>(null);
    const [selectedItem, setSelectedItem] = useState<Item | undefined>(undefined);
    const [showSettingsMenu, setShowSettingsMenu] = useState<boolean>(false);

    const { data, error } = useSWR('/api/orders/archived', fetcher, { refreshInterval: 60000 });

    const orders = useMemo(() => data?.orders as SerializedOrderWithRelations[] || [], [data]);  

    const filteredOrders = useMemo(() => {
        if (searchQuery === '') {
            return orders;
        } else {
            const query = searchQuery.toLowerCase();
            return orders.filter((order) => {
                return (
                    order.name.toLowerCase().includes(query) ||
                    order.vendor.toLowerCase().includes(query) ||
                    order.status.toLowerCase().includes(query) ||
                    order.user.subteam.toLowerCase().includes(query) ||
                    (order.comments && order.comments.toLowerCase().includes(query)) ||
                    order.items.some((item) =>
                        item.name.toLowerCase().includes(query) ||
                        item.vendor.toLowerCase().includes(query) ||
                        item.status.toLowerCase().includes(query)
                    )
                );
            });
        }
    }, [orders, searchQuery]);

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
        // Re-fetch data after update
        mutate('/api/orders/archived');
    };

    const toggleExpand = (orderId: number, orderItems: SerializedOrderWithRelations['items'], orderUrl: string | null) => {
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

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    if (error) {
        return <div>Error loading archived orders.</div>;
    }

    if (!data) {
        return <div>Loading archived orders...</div>;
    }

    return (
        <div className={styles.tableMainContainer}>
            <div className={styles.tableTop}>
                <h1 className={styles.purchaseHeader}>Archived Orders</h1>
                <div className={styles.tableSearch}>
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={handleSearch}
                        className={styles.searchBar}
                    />
                </div>
            </div>
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
                            <th className={`${styles.thText} ${styles.datePlacedColumn}`}>Date Placed</th>
                            <th className={`${styles.thText}`}>Name</th>
                            <th className={`${styles.thText} ${styles.vendorColumn}`}>Vendor</th>
                            <th className={`${styles.thText} ${styles.linkColumn}`}>Link</th>
                            <th className={`${styles.thText} ${styles.priceColumn}`}>Price</th>
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
                                        #{order.id}
                                    </td>
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
                                    <td
                                        className={`${styles.tdText} ${
                                            order.status === OrderStatus.ARCHIVED
                                                ? styles.orderStatusArchived
                                                : styles.orderStatusDefault
                                        }`}
                                    >
                                        {order.status.toUpperCase()}
                                    </td>
                                    <td className={`${styles.tdText} ${styles.textColumn}`}>
                                        {order.user.subteam}
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
                                    <tr key={`expanded-${order.id}`}>
                                        <td colSpan={10}>
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
                                                                className={`${styles.itemStatusText} ${styles.itemStatus} ${styles.itemStatusArchived}`}
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
                    <p>No archived orders to show. 🎉</p>
                    <p>Looks like nothing&apos;s here!</p>
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

export default ArchiveTable;