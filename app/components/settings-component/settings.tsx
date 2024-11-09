import React, { useRef, useState } from 'react';
import styles from './settings-menu.module.css';
import { OrderStatus, ItemStatus, Item } from '@prisma/client';
import { upload } from '@vercel/blob/client';
import { useToast } from '../toast/use-toast';
import CloseIcon from "../../../assets/close.svg";
import Image from 'next/image';
import useSWR from 'swr';
import { SerializedOrderWithRelations } from '../order-table/order-table';
import { useSession } from 'next-auth/react';

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
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const SettingsMenu: React.FC<SettingsMenuProps> = ({ order, item, onClose, onUpdateOrder }) => {
    const { data: session } = useSession();
    const email = session?.user.email;
    const admins = process.env.NEXT_PUBLIC_ADMINS?.split(",") || [];
    const isAdmin = email ? admins.includes(email) : false;
    // Separate state variables for order and item status
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
    
      // Update receipts state when data changes
      React.useEffect(() => {
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
            const body: UpdateOrderBody = { status: orderStatus };
            if (priceEdited) {
            body.totalCost = price;
            body.costVerified = true;
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
      
              const data = await response.json();
              // Optionally, update receipts state here
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

    return (
        <div className={styles.overlay}>
        <div className={styles.settingsMenu}>
            <div className={styles.formHeader}>
            <h3 className={styles.formTitle}>Settings</h3>
            <button className={styles.closeButton} onClick={onClose}>
                <Image src={CloseIcon.src} height={10} width={10} alt='close' />
            </button>
            </div>

            {/* Display additional information for the order */}
            {!item && order && (
            <div className={styles.infoSection}>
                <h4 className={styles.infoLabel}>Order Name:</h4>
                <p className={styles.infoText}>{order.name}</p>

                <h4 className={styles.infoLabel}>Placed By:</h4>
                <p className={styles.infoText}>{order.user.name}</p>

                {order.comments && (
                <>
                    <h4 className={styles.infoLabel}>Comments:</h4>
                    <p className={styles.infoText}>{order.comments}</p>
                </>
                )}

                {/* Cost Breakdown Section */}
                <h4 className={styles.infoLabel}>Cost Breakdown:</h4>
                {order.costBreakdown ? (
                <ul className={styles.costBreakdownList}>
                    {Object.entries(order.costBreakdown)
                    .filter(([, percentage]) => percentage > 0)
                    .map(([subteam, percentage]) => (
                        <li key={subteam} className={styles.breakdownItem}>
                        {subteamMapping[subteam] || subteam}: {percentage}%
                        </li>
                    ))}
                </ul>
                ) : (
                <p className={styles.infoText}>N/A</p>
                )}

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
                        <a href={doc.url} target="_blank" rel="noopener noreferrer" className={styles.docLink}>
                            <span className={styles.docIcon}>📄</span>
                            <span className={styles.docName}>{doc.url.split('/').pop()}</span>
                        </a>
                        {
                            isAdmin && 
                            <button onClick={() => handleDeleteReceipt(doc.id)} className={styles.deleteButton}>
                                Delete
                            </button>
                        }
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
                {
                    isAdmin && 
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
                }
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
                    <label>Price:</label>
                    <input
                    type="number"
                    value={price}
                    onChange={handlePriceChange}
                    className={styles.numberInput}
                    />
                </div>
                </>
            )}
            </div>
            
            {isAdmin && 
            <div className={styles.receiptButton}>
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

                    <button
                            onClick={handleDeleteOrder}
                            className={`${styles.deleteOrderButton} ${styles.button}`}
                        >
                            Delete Order
                        </button>
            </div>}

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