'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import styles from './order-detail.module.css';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
import LinkIcon from '../../../assets/link.svg';

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
    supportingDocs: { id: number; url: string; uploadedAt: string }[];
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
    costBreakdown: Record<string, number> | null;
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

    const getStatusClass = (status: string) => {
        const map: { [key: string]: string } = {
            'TO_ORDER': styles.orderStatusToOrder,
            'PLACED': styles.orderStatusPlaced,
            'MEEN_HOLD': styles.orderStatusMeenHold,
            'PROCESSED': styles.orderStatusProcessed,
            'SHIPPED': styles.orderStatusShipped,
            'AWAITING_PICKUP': styles.orderStatusAwaitingPickup,
            'DELIVERED': styles.orderStatusDelivered,
            'PARTIAL': styles.orderStatusPartial,
        };
        return map[status] || styles.orderStatusDefault;
    };

    if (!session) {
        return (
            <div className={styles.mainContainer}>
                <div className={styles.errorState}>
                    <p>Please log in to view this order.</p>
                    <button onClick={() => router.push('/account')} className={styles.backButton}>
                        Go to Login
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className={styles.mainContainer}>
                <div className={styles.loadingState}>
                    <p>Loading details...</p>
                </div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className={styles.mainContainer}>
                <div className={styles.errorState}>
                    <p>{error || 'Order not found'}</p>
                    <button onClick={() => router.back()} className={styles.backButton}>
                        ← Go Back
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.mainContainer}>
            <div className={styles.topNavigation}>
                <button 
                    onClick={() => router.push('https://relay.tamuformulaelectric.com')} // Or router.back()
                    className={styles.backButton}
                >
                    ← Back to Orders
                </button>
            </div>

            <div className={styles.headerSection}>
                <h1 className={styles.pageTitle}>{order.name}</h1>
                <span className={styles.orderIdBadge}>
                    {order.meenOrderId ? `#${order.meenOrderId}` : `#${order.id}`}
                </span>
            </div>

            <div className={styles.infoGrid}>
                <div className={styles.detailCard}>
                    <h3 className={styles.cardHeader}>Order Information</h3>
                    
                    <div className={styles.row}>
                        <span className={styles.label}>Current Status</span>
                        <span className={getStatusClass(order.status)}>{order.status}</span>
                    </div>
                    
                    <div className={styles.row}>
                        <span className={styles.label}>Vendor</span>
                        <span className={styles.value}>{order.vendor}</span>
                    </div>

                    <div className={styles.row}>
                        <span className={styles.label}>Total Cost</span>
                        <span className={styles.value}>
                            ${order.totalCost.toFixed(2)} 
                            {order.costVerified && <span className={styles.verified}>✓</span>}
                        </span>
                    </div>

                    <div className={styles.row}>
                        <span className={styles.label}>Date Placed</span>
                        <span className={styles.value}>{new Date(order.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div className={styles.row}>
                        <span className={styles.label}>Requester</span>
                        <span className={styles.value}>{order.user.name} ({order.user.subteam})</span>
                    </div>

                    {order.deliveryLocation && (
                        <div className={styles.row}>
                            <span className={styles.label}>Delivery Loc</span>
                            <span className={styles.value}>{order.deliveryLocation}</span>
                        </div>
                    )}

                    {(order.carrier || order.trackingId) && (
                        <div className={styles.row}>
                            <span className={styles.label}>Tracking</span>
                            <span className={styles.value}>
                                {order.carrier || 'Unknown'} — {order.trackingId || 'N/A'}
                            </span>
                        </div>
                    )}

                    {order.url && (
                        <div className={styles.row}>
                            <span className={styles.label}>Vendor Link</span>
                            <button 
                                className={styles.actionButton}
                                onClick={() => window.open(order.url!, '_blank')}
                            >
                                Open URL <Image src={LinkIcon.src} height={12} width={12} alt="link" />
                            </button>
                        </div>
                    )}

                    {order.comments && (
                        <div className={styles.row} style={{flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem'}}>
                            <span className={styles.label}>Comments</span>
                            <span className={styles.value} style={{textAlign: 'left', fontStyle: 'italic'}}>
                                &quot;{order.comments}&quot;
                            </span>
                        </div>
                    )}
                </div>

                <div className={styles.detailCard}>
                    <h3 className={styles.cardHeader}>Cost Breakdown</h3>
                    {order.costBreakdown ? (
                        <div className={styles.breakdownList}>
                            {Object.entries(order.costBreakdown).map(([subteam, percentage]) => (
                                percentage > 0 && (
                                    <div key={subteam} className={styles.breakdownRow}>
                                        <strong>{subteam}</strong>
                                        <span>{percentage}%</span>
                                    </div>
                                )
                            ))}
                        </div>
                    ) : (
                        <p className={styles.value} style={{textAlign: 'center'}}>No breakdown available</p>
                    )}
                </div>
            </div>

            <div className={styles.itemsSection}>
                <h2 className={styles.cardHeader}>Items in Order ({order.items.length})</h2>
                
                {order.items.length > 0 ? (
                    <div className={styles.itemsList}>
                        {order.items.map((item) => (
                            <div key={item.id} className={styles.itemRow}>
                                <div className={styles.itemInfo}>
                                    <h4 className={styles.itemName}>{item.name}</h4>
                                    <span className={styles.itemSub}>
                                        {item.vendor} {item.partNumber ? `• P/N: ${item.partNumber}` : ''}
                                    </span>
                                    <span className={styles.itemSub}>
                                        {item.quantity} x ${item.price.toFixed(2)}
                                    </span>
                                </div>

                                <div className={styles.itemActions}>
                                    <span className={getStatusClass(item.status)}>
                                        {item.status.toUpperCase()}
                                    </span>
                                    
                                    {item.link && (
                                        <button 
                                            className={styles.actionButton}
                                            style={{backgroundColor: '#F3F4F6', color: '#5D5D5D'}}
                                            onClick={() => window.open(item.link!, '_blank')}
                                        >
                                            View Item
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p style={{textAlign: 'center'}}>No items attached to this order.</p>
                )}
            </div>
        </div>
    );
}