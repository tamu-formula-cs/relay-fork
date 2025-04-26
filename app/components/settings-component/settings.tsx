import React, { useRef, useState, useEffect } from 'react';
import styles from './settings-menu.module.css';
import { OrderStatus, ItemStatus, Item } from '@prisma/client';
import { useToast } from '../toast/use-toast';
import CloseIcon from "../../../assets/close.svg";
import Image from 'next/image';
import useSWR from 'swr';
import { SerializedOrderWithRelations } from '../order-table/order-table';
import { useSession } from 'next-auth/react';
import DownloadIcon from "../../../assets/file_download.svg"
import * as XLSX from 'xlsx';

interface SettingsMenuProps {
    order: SerializedOrderWithRelations | null;
    item?: Item;
    onClose: () => void;
    onUpdateOrder: () => void;
}

interface Document {
    id: number;
    url: string;
    orderId: number;
    uploadedAt: string;
}

interface UpdateOrderBody {
    status: OrderStatus;
    totalCost?: number;
    costVerified?: boolean;
    carrier?: string;
    trackingId?: string;
    meenOrderId?: string;
    comments?: string;
    costBreakdown?: { [key: string]: number };
}

interface UpdateItemBody {
    status: ItemStatus;
}

const subteamMapping: { [key: string]: string } = {
    AERO: 'Aerodynamics',
    CHS: 'Chassis',
    SUS: 'Suspension',
    BAT: 'Battery',
    ECE: 'Electronics',
    PT: 'Powertrain',
    DBMS: 'Distributed BMS',
    OPS: 'Operations'
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const SettingsMenu: React.FC<SettingsMenuProps> = ({ order, item, onClose, onUpdateOrder }) => {
    const { data: session } = useSession();
    const email = session?.user.email;
    const admins = process.env.NEXT_PUBLIC_ADMINS?.split(",") || [];
    const leads = process.env.NEXT_PUBLIC_LEADS?.split(",") || [];
    const isAdmin = email ? admins.includes(email) : false;
    const isLead = email ? leads.includes(email) : false;

    const initialCostBreakdown = {
        AERO: 0,
        CHS: 0,
        SUS: 0,
        BAT: 0,
        ECE: 0,
        PT: 0,
        DBMS: 0,
        OPS: 0,
        ...(order?.costBreakdown || {}),
    };

    const [costBreakdown, setCostBreakdown] = useState<{ [key: string]: number }>(initialCostBreakdown);

    const [orderStatus, setOrderStatus] = useState<OrderStatus>(
        order ? order.status : OrderStatus.TO_ORDER
    );
    const [itemStatus, setItemStatus] = useState<ItemStatus>(
        item ? item.status : ItemStatus.TO_ORDER
    );
    const [price, setPrice] = useState(order ? order.totalCost : 0);
    const [priceEdited, setPriceEdited] = useState(false);

    const [receipts, setReceipts] = useState<Document[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    const [comments, setComments] = useState(order?.comments || '');

    const [carrier, setCarrier] = useState<string>(order?.carrier || '');
    const [trackingId, setTrackingId] = useState<string>(order?.trackingId || '');
    const [meenOrderId, setMeenOrderId] = useState<string>(order?.meenOrderId || '');
    const [isPriceVerified, setIsPriceVerified] = useState(order ? order.costVerified : false);
    
    const userSubteam = session?.user.subteam;
    const [canDeleteOrder, setCanDeleteOrder] = useState(false);
    useEffect(() => {
        
        if (order && isLead && userSubteam === order.subteam) {
            const orderCreatedAt = new Date(order.createdAt);
            const currentTime = new Date();
    
            // Define the time interval in milliseconds (e.g., 12 hours)
            const timeInterval = 1 * 60 * 60 * 1000; // 1 hour in milliseconds
            // For 5 seconds, you can set: const timeInterval = 5 * 1000;
    
            const timeDifference = currentTime.getTime() - orderCreatedAt.getTime();
            if (timeDifference <= timeInterval) {
                setCanDeleteOrder(true);
            }
        }
    }, [order, isLead, userSubteam]);    

    useEffect(() => {
        if (order) {
            const updatedCostBreakdown = {
                AERO: 0,
                CHS: 0,
                SUS: 0,
                BAT: 0,
                ECE: 0,
                PT: 0,
                DBMS: 0,
                SW: 0,
                ...(order.costBreakdown || {}),
            };
            setCostBreakdown(updatedCostBreakdown);
        }
    }, [order]);

    
    const handleCarrierChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setCarrier(e.target.value);
    };

    const handleTrackingIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTrackingId(e.target.value);
    };

    const handleOrderStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setOrderStatus(e.target.value as OrderStatus);
    };

    const handleItemStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setItemStatus(e.target.value as ItemStatus);
    };

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPrice(parseFloat(e.target.value));
        setPriceEdited(true);
    };

    const { data: supportingDocs } = useSWR<Document[]>(
        order ? `/api/orders/${order.id}/documents` : null,
        fetcher
    );

    const { data: receiptsData, mutate: mutateReceipts } = useSWR<Document[]>(
        order ? `/api/orders/${order.id}/receipts` : null,
        fetcher
    );

    useEffect(() => {
        if (receiptsData) {
            setReceipts(receiptsData);
        }
    }, [receiptsData]);

    const handleSave = async () => {
        try {
            if (item) {
                const body: UpdateItemBody = { status: itemStatus };
                const response = await fetch(`/api/items/update/${item.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(body),
                });

                if (response.ok) {
                    onUpdateOrder();
                }
            } else if (order) {
                if (isAdmin) {
                    const totalPercentage = Object.values(costBreakdown).reduce((a, b) => a + b, 0);
                    if (totalPercentage !== 100) {
                        toast({
                            title: "Invalid Cost Breakdown",
                            description: "Cost breakdown percentages must add up to 100%",
                            variant: "destructive",
                        });
                        return;
                    }
                }
                const body: UpdateOrderBody = { status: orderStatus, carrier, trackingId, meenOrderId, comments, };
                if (priceEdited) {
                    body.totalCost = price;
                }
                body.costVerified = isPriceVerified;

                if (isAdmin) {
                    body.costBreakdown = costBreakdown;
                }

                const response = await fetch(`/api/orders/update/${order.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(body),
                });

                if (response.ok) {
                    onUpdateOrder();
                }
            }
            onClose();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleAddReceipt = () => {
        fileInputRef.current?.click();
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0 && order) {
            try {
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    if (file.type !== 'application/pdf') {
                        toast({
                            title: 'Invalid File Type',
                            description: 'Only PDF files are allowed.',
                            variant: 'destructive',
                        });
                        continue;
                    }

                    const formData = new FormData();
                    formData.append('file', file);

                    const response = await fetch(`/api/orders/addReceipt?orderId=${order.id}`, {
                        method: 'POST',
                        body: formData,
                    });

                    if (!response.ok) {
                        const errorData = await response.json();
                        throw new Error(errorData.error);
                    }
                }

                mutateReceipts();
                toast({
                    title: 'Receipts Uploaded',
                    description: 'Receipts uploaded successfully.',
                    variant: 'affirmation',
                });
            } catch (error) {
                console.error('Error uploading receipts:', error);
                toast({
                    title: 'Upload Error',
                    description: 'An error occurred while uploading receipts.',
                    variant: 'destructive',
                });
            }
        }
    };

    const handleDeleteReceipt = async (documentId: number) => {
        try {
            const response = await fetch(`/api/orders/deleteReceipt`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ documentId }),
            });

            if (response.ok) {
                mutateReceipts();
                toast({
                    title: 'Receipt Deleted',
                    description: 'Receipt deleted successfully.',
                    variant: 'affirmation',
                });
            } else {
                const errorData = await response.json();
                throw new Error(errorData.error);
            }
        } catch (error) {
            console.error('Error deleting receipt:', error);
            toast({
                title: 'Deletion Error',
                description: 'An error occurred while deleting the receipt.',
                variant: 'destructive',
            });
        }
    };

    const handleDeleteOrder = async () => {
        if (order) {
            try {
                const confirmed = window.confirm(
                    'Are you sure you want to delete this order? This action cannot be undone.'
                );
                if (!confirmed) return;

                const response = await fetch(`/api/orders/delete`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orderId: order.id }),
                });

                if (response.ok) {
                    toast({
                        title: 'Order Deleted',
                        description: 'Order deleted successfully.',
                        variant: 'affirmation',
                    });
                    onUpdateOrder();
                    onClose();
                } else {
                    const errorData = await response.json();
                    throw new Error(errorData.error);
                }
            } catch (error) {
                console.error('Error deleting order:', error);
                toast({
                    title: 'Deletion Error',
                    description: 'An error occurred while deleting the order.',
                    variant: 'destructive',
                });
            }
        }
    };

    const handleDownloadExcel = () => {
        if (order && order.items && order.items.length > 0) {
            // Create workbook
            const wb = XLSX.utils.book_new();
            
            // Prepare headers and data
            const headers = ['Item', 'Part Number', 'Notes', 'QTY to Buy', 'Cost', 'Vendor', 'Link'];
            const rows = order.items.map(item => [
                item.name || '',
                item.partNumber || '',
                item.notes || '',
                item.quantity,
                item.price,
                item.vendor || '',
                item.link || ''
            ]);
    
            // Create worksheet with headers and data
            const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
            
            // Add worksheet to workbook
            XLSX.utils.book_append_sheet(wb, ws, "Order Items");
            
            // Generate Excel file
            const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            
            // Create blob and download
            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.href = url;
            link.setAttribute('download', `${order.name}.xlsx`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.settingsMenu}>
                <div className={styles.formHeader}>
                    <h3 className={styles.formTitle}>Settings</h3>
                    <div className={styles.settingsButtonGroup}>
                        {order && !order.url && order.items && order.items.length > 0 && (
                            <button className={styles.downloadButton} onClick={handleDownloadExcel}>
                                <Image src={DownloadIcon.src} height={10} width={10} alt='download' />
                            </button>
                        )}
                        <button className={styles.closeButton} onClick={onClose}>
                            <Image src={CloseIcon.src} height={10} width={10} alt='close' />
                        </button>
                    </div>
                </div>

                <div className={styles.contentContainer}>
                    {/* Display additional information for the order */}
                    {!item && order && (
                        <div className={styles.infoSection}>
                            <h4 className={`${styles.infoLabel} ${styles.orderName}`}>Order Name:</h4>
                            <p className={styles.infoText}>{order.name}</p>

                            <h4 className={styles.infoLabel}>Placed By:</h4>
                            <p className={styles.infoText}>{order.user.name}</p>

                            <h4 className={styles.infoLabel}>Deliver to:</h4>
                            <p className={styles.infoText}>{order.deliveryLocation}</p>

                            {/* Cost Breakdown Section */}
                            {isAdmin &&
                            <>
                            <h4 className={styles.infoLabel}>Cost Breakdown:</h4>
                            <div className={styles.costBreakdownList}>
                                {Object.keys(subteamMapping).map((subteam) => (
                                    <div key={subteam} className={styles.breakdownItem}>
                                        <label className={styles.breakdownLabel}>
                                            {subteamMapping[subteam] || subteam}:
                                        </label>
                                        {isAdmin ? (
                                            <input
                                                type="number"
                                                className={styles.breakdownInput}
                                                value={costBreakdown[subteam]}
                                                onChange={(e) => {
                                                    const value = parseFloat(e.target.value) || 0;
                                                    setCostBreakdown((prev) => ({
                                                        ...prev,
                                                        [subteam]: value,
                                                    }));
                                                }}
                                            />
                                        ) : (
                                            <span>{costBreakdown[subteam]}%</span>
                                        )}
                                    </div>
                                ))}
                            </div>
                            </>
                            }

                            {supportingDocs && supportingDocs.length > 0 && (
                                <div className={styles.docSection}>
                                    <h4 className={styles.infoLabel}>Supporting Documents:</h4>
                                    <div className={styles.docsContainer}>
                                        {supportingDocs.map((doc: Document, index: number) => (
                                            <a
                                                key={index}
                                                href={doc.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className={styles.docLink}
                                            >
                                                <span className={styles.docIcon}>📄</span>
                                                <span className={styles.docName}>{doc.url.split('/').pop()}</span>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {receipts && receipts.length > 0 ? (
                                <div className={styles.receiptSection}>
                                    <h4 className={styles.infoLabel}>Receipts:</h4>
                                    <div className={styles.docsContainer}>
                                        {receipts.map((doc: Document) => (
                                            <div key={doc.id} className={styles.docItem}>
                                                <a
                                                    href={doc.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className={styles.docLink}
                                                >
                                                    <span className={styles.docIcon}>📄</span>
                                                    <span className={styles.docName}>{doc.url.split('/').pop()}</span>
                                                </a>
                                                {isAdmin && (
                                                    <button
                                                        onClick={() => handleDeleteReceipt(doc.id)}
                                                        className={styles.deleteButton}
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className={styles.receiptSection}>
                                    <h4 className={styles.infoLabel}>Receipts:</h4>
                                    <p className={styles.infoText}>No receipts added yet.</p>
                                </div>
                            )}

                            {order && (isAdmin || (session?.user.subteam === order.subteam)) && (
                                <div className={styles.commentSection}>
                                    <h4 className={styles.infoLabel}>Comments:</h4>
                                    <textarea
                                        value={comments}
                                        onChange={(e) => setComments(e.target.value)}
                                        className={styles.textarea}
                                        rows={4}
                                    />
                                </div>
                            )}

                        </div>
                    )}

                    <div className={styles.settingsGroup}>
                        {/* Display item details if an item is provided */}
                        {item && (
                            <>
                                <div className={styles.inputGroup}>
                                    <label>Item Name:</label>
                                    <p className={styles.infoText}>{item.name}</p>
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>Part Number:</label>
                                    <p className={styles.infoText}>{item.partNumber || 'N/A'}</p>
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>URL:</label>
                                    {item.link ? (
                                        <a
                                            href={item.link}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className={styles.itemLink}
                                        >
                                            {item.link}
                                        </a>
                                    ) : (
                                        <p className={styles.infoText}>N/A</p>
                                    )}
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>Quantity:</label>
                                    <p className={styles.infoText}>{item.quantity || 'N/A'}</p>
                                </div>
                                {item.notes && 
                                <div className={styles.inputGroup}>
                                    <label>Notes:</label>
                                    <p className={styles.infoText}>{item.notes}</p>
                                </div>}
                                {isAdmin && (
                                    <div className={styles.inputGroup}>
                                        <label>Status:</label>
                                        <select value={itemStatus} onChange={handleItemStatusChange}>
                                            {Object.values(ItemStatus).map((option) => (
                                                <option key={option} value={option}>
                                                    {option.toUpperCase()}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </>
                        )}

                        {/* Display order status and price if an order is provided */}
                        {order && isAdmin && (
                            <>
                                <div className={styles.inputGroup}>
                                    <label>Status:</label>
                                    <select value={orderStatus} onChange={handleOrderStatusChange}>
                                        {Object.values(OrderStatus).map((option) => (
                                            <option key={option} value={option}>
                                                {option.toUpperCase()}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className={styles.inputGroup}>
                                    <label>MEEN Order ID:</label>
                                    <input
                                        type="text"
                                        value={meenOrderId}
                                        onChange={(e) => setMeenOrderId(e.target.value)}
                                        className={styles.textInput}
                                    />
                                </div>

                                <div className={styles.inputGroup}>
                                    <label>Price:</label>
                                    <div className={styles.priceContainer}>
                                        <input
                                            type="number"
                                            value={price}
                                            onChange={handlePriceChange}
                                            className={styles.numberInput}
                                        />
                                        <label className={styles.checkboxLabel}>
                                            Verify Price
                                            <input
                                                type="checkbox"
                                                checked={isPriceVerified}
                                                onChange={(e) => setIsPriceVerified(e.target.checked)}
                                                className={styles.checkboxInput}
                                            />
                                        </label>
                                    </div>
                                </div>

                                <div className={styles.inputGroup}>
                                    <label>Carrier:</label>
                                    <select value={carrier} onChange={handleCarrierChange}>
                                        <option value="">Select Carrier</option>
                                        <option value="UPS">UPS</option>
                                        <option value="FEDEX">FEDEX</option>
                                    </select>
                                </div>

                                <div className={styles.inputGroup}>
                                    <label>Tracking ID:</label>
                                    <input
                                        type="text"
                                        value={trackingId}
                                        onChange={handleTrackingIdChange}
                                        className={styles.textInput}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {(isAdmin || canDeleteOrder) && (
                    <div className={styles.receiptButton}>
                        {isAdmin && (
                            <>
                                <button onClick={handleAddReceipt} className={`${styles.saveButton} ${styles.button}`}>
                                    Add Receipt
                                </button>
                                <input
                                    type="file"
                                    multiple
                                    accept="application/pdf"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    onChange={handleFileUpload}
                                />
                            </>
                        )}

                        {order && (
                            <button
                                onClick={handleDeleteOrder}
                                className={`${styles.deleteOrderButton} ${styles.button}`}
                            >
                                Delete Order
                            </button>
                        )}
                    </div>
                )}

                <div className={styles.buttonGroup}>
                    <button onClick={onClose} className={`${styles.cancelButton} ${styles.button}`}>
                        Cancel
                    </button>
                    <button onClick={handleSave} className={`${styles.saveButton} ${styles.button}`}>
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsMenu;
