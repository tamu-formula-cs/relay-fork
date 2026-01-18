'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styles from './order-detail.module.css';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import LinkIcon from '../../../assets/link.svg';
import OpenURLIcon from '../../../assets/open_url.svg';

interface SerializedItemsWithRelations {
    id: number;
    internalItemId: string;
    internalSKU: string | null;
    orderId: number;
    name: string;
    partNumber: string;
    notes: string | null;
    quantity: number;
    price: number;
    priceVerified: boolean;
    vendor: string;
    vendorSKU: string | null;
    link: string | null;
    status: string;
    location: string | null;
    level: string | null;
    createdAt: string;
    updatedAt: string;
}

interface SerializedOrderWithRelations {
    subteam: string;
    supportingDocs: any[];
    id: number;
    internalOrderId: string;
    meenOrderId: string | null;
    name: string;
    userId: number;
    status: string;
    vendor: string;
    totalCost: number;
    costVerified: boolean;
    comments: string | null;
    url: string | null;
    carrier: string | null;
    trackingId: string | null;
    costBreakdown: any;
    createdAt: string;
    updatedAt: string;
    user: {
        id: number;
        name: string;
        email: string;
        subteam: string;
        role: string;
        createdAt: string;
        updatedAt: string;
    };
    items: SerializedItemsWithRelations[];
    deliveryLocation: string | null;
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

export default function OrderDetail() {
    const params = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const orderId = params.orderId as string;

    const [order, setOrder] = useState<SerializedOrderWithRelations | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!orderId) return;

        const fetchOrder = async () => {
            try {
                const res = await fetch(`/api/orders/${orderId}`);
                if (!res.ok) {
                    throw new Error('Order not found');
                }
                const data = await res.json();
                setOrder(data.order);
            } catch (err) {
                setError((err as Error).message || 'Failed to load order');
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [orderId]);

    if (!session) {
        return (
            <div className={styles.container}>
                <div className={styles.errorMessage}>
                    <p>Please log in to view this order</p>
                    <button onClick={() => router.push('/account')} className={styles.backButton}>
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className={styles.container}>
                <p>Loading order details...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.container}>
                <div className={styles.errorMessage}>
                    <p>Error: {error}</p>
                    <button onClick={() => router.back()} className={styles.backButton}>
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    if (!order) {
        return (
            <div className={styles.container}>
                <div className={styles.errorMessage}>
                    <p>Order not found</p>
                    <button onClick={() => router.back()} className={styles.backButton}>
                        Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <button onClick={() => router.back()} className={styles.backButton}>
                ← Back
            </button>

            <div className={styles.orderHeader}>
                <h1>{order.name}</h1>
                <span className={styles.orderId}>#{order.meenOrderId || order.id}</span>
            </div>

            <div className={styles.orderInfo}>
                <div className={styles.infoCard}>
                    <h3>Order Details</h3>
                    <div className={styles.infoRow}>
                        <label>Status:</label>
                        <span className={getStatusClassName(order.status)}>{order.status}</span>
                    </div>
                    <div className={styles.infoRow}>
                        <label>Vendor:</label>
                        <span>{order.vendor}</span>
                    </div>
                    <div className={styles.infoRow}>
                        <label>Total Cost:</label>
                        <span>${order.totalCost.toFixed(2)} {order.costVerified && <span className={styles.verified}>✓</span>}</span>
                    </div>
                    <div className={styles.infoRow}>
                        <label>Date Placed:</label>
                        <span>{new Date(order.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className={styles.infoRow}>
                        <label>Placed By:</label>
                        <span>{order.user.name} ({order.user.email})</span>
                    </div>
                    {order.deliveryLocation && (
                        <div className={styles.infoRow}>
                            <label>Delivery Location:</label>
                            <span>{order.deliveryLocation}</span>
                        </div>
                    )}
                    {order.carrier && order.trackingId && (
                        <div className={styles.infoRow}>
                            <label>Tracking:</label>
                            <span>{order.carrier} - {order.trackingId}</span>
                        </div>
                    )}
                    {order.url && (
                        <div className={styles.infoRow}>
                            <label>Link:</label>
                            <button 
                                className={styles.externalLink}
                                onClick={() => window.open(order.url!, '_blank')}
                            >
                                View Vendor Link <Image src={LinkIcon.src} height={12} width={12} alt="link" />
                            </button>
                        </div>
                    )}
                    {order.comments && (
                        <div className={styles.infoRow}>
                            <label>Comments:</label>
                            <span>{order.comments}</span>
                        </div>
                    )}
                </div>

                <div className={styles.infoCard}>
                    <h3>Cost Breakdown</h3>
                    {order.costBreakdown ? (
                        <div className={styles.costBreakdown}>
                            {Object.entries(order.costBreakdown).map(([subteam, percentage]: [string, any]) => (
                                percentage > 0 && (
                                    <div key={subteam} className={styles.breakdownItem}>
                                        <span>{subteam}: </span>
                                        <span className={styles.percentage}>{percentage}%</span>
                                    </div>
                                )
                            ))}
                        </div>
                    ) : (
                        <p>No cost breakdown available</p>
                    )}
                </div>
            </div>

            <div className={styles.itemsSection}>
                <h2>Items in Order</h2>
                {order.items.length > 0 ? (
                    <div className={styles.itemsGrid}>
                        {order.items.map((item) => (
                            <div key={item.id} className={styles.itemCard}>
                                <div className={styles.itemHeader}>
                                    <h4>{item.name}</h4>
                                    <span className={getItemStatusClassName(item.status)}>{item.status}</span>
                                </div>
                                <div className={styles.itemDetails}>
                                    <div className={styles.itemRow}>
                                        <label>Quantity:</label>
                                        <span>{item.quantity}</span>
                                    </div>
                                    <div className={styles.itemRow}>
                                        <label>Price:</label>
                                        <span>${item.price.toFixed(2)}</span>
                                    </div>
                                    <div className={styles.itemRow}>
                                        <label>Vendor:</label>
                                        <span>{item.vendor}</span>
                                    </div>
                                    {item.vendorSKU && (
                                        <div className={styles.itemRow}>
                                            <label>Vendor SKU:</label>
                                            <span>{item.vendorSKU}</span>
                                        </div>
                                    )}
                                    {item.internalSKU && (
                                        <div className={styles.itemRow}>
                                            <label>Internal SKU:</label>
                                            <span>{item.internalSKU}</span>
                                        </div>
                                    )}
                                    {item.partNumber && (
                                        <div className={styles.itemRow}>
                                            <label>Part Number:</label>
                                            <span>{item.partNumber}</span>
                                        </div>
                                    )}
                                    {item.location && (
                                        <div className={styles.itemRow}>
                                            <label>Location:</label>
                                            <span>{item.location}</span>
                                        </div>
                                    )}
                                    {item.notes && (
                                        <div className={styles.itemRow}>
                                            <label>Notes:</label>
                                            <span>{item.notes}</span>
                                        </div>
                                    )}
                                    {item.link && (
                                        <button 
                                            className={styles.itemLink}
                                            onClick={() => window.open(item.link!, '_blank')}
                                        >
                                            View Product Link
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p>No items in this order</p>
                )}
            </div>
        </div>
    );
}

function getStatusClassName(status: string): string {
    const statusClass = {
        'TO_ORDER': 'statusToOrder',
        'PLACED': 'statusPlaced',
        'MEEN_HOLD': 'statusMeenHold',
        'PROCESSED': 'statusProcessed',
        'SHIPPED': 'statusShipped',
        'AWAITING_PICKUP': 'statusAwaitingPickup',
        'DELIVERED': 'statusDelivered',
        'PARTIAL': 'statusPartial',
    }[status] || 'statusDefault';
    return statusClass;
}

function getItemStatusClassName(status: string): string {
    const statusClass = {
        'TO_ORDER': 'itemStatusToOrder',
        'PLACED': 'itemStatusPlaced',
        'PROCESSED': 'itemStatusProcessed',
        'SHIPPED': 'itemStatusShipped',
        'DELIVERED': 'itemStatusDelivered',
    }[status] || 'itemStatusDefault';
    return statusClass;
}
