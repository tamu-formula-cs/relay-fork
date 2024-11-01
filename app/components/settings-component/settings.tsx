import React, { useState } from 'react';
import styles from './settings-menu.module.css';
import { OrderStatus, ItemStatus } from '@prisma/client';
import CloseIcon from "../../../assets/close.svg";
import Image from 'next/image';
import useSWR from 'swr';

interface SettingsMenuProps {
    order: any;
    item?: any;
    onClose: () => void;
    onUpdateOrder: () => void;
}

const subteamMapping: { [key: string]: string } = {
    AERO: 'Aerodynamics',
    CHS: 'Chassis',
    SUS: 'Suspension',
    BAT: 'Battery',
    ECE: 'Electronics',
    PT: 'Powertrain',
};

const fetcher = (url: string | URL | Request) => fetch(url).then((res) => res.json());

const SettingsMenu: React.FC<SettingsMenuProps> = ({ order, item, onClose, onUpdateOrder }) => {
    const [status, setStatus] = useState(item ? item.status : order.status);
    const [price, setPrice] = useState(order ? order.totalCost : 0);
    const [priceEdited, setPriceEdited] = useState(false);

    const statusOptions = item ? Object.values(ItemStatus) : Object.values(OrderStatus);

    const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setStatus(e.target.value);
    };

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPrice(parseFloat(e.target.value));
        setPriceEdited(true);
    };
    
    const { data: supportingDocs } = useSWR(
        order ? `/api/orders/${order.id}/documents` : null,
        fetcher
    );

    const handleSave = async () => {
        try {
            if (item) {
                const response = await fetch(`/api/items/update/${item.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ status }),
                });

                if (response.ok) {
                    onUpdateOrder();
                }
            } else {
                const body: any = { status };
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

    return (
        <div className={styles.overlay}>
            <div className={styles.settingsMenu}>
                <div className={styles.formHeader}>
                    <h3 className={styles.formTitle}>Settings</h3>
                    <button className={styles.closeButton} onClick={onClose}>
                        <Image src={CloseIcon.src} height={10} width={10} alt='close'/>
                    </button>
                </div>

                {/* Display additional information for the order */}
                {!item && order && 
                <div className={styles.infoSection}>
                    <h4 className={styles.infoLabel}>Order Name:</h4>
                    <p className={styles.infoText}>{order ? order.name : "N/A"}</p>
                    
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
                                .filter(([, percentage]) => percentage as number > 0)
                                .map(([subteam, percentage]) => (
                                    <li key={subteam} className={styles.breakdownItem}>
                                        {Object.keys(subteamMapping).find(key => subteamMapping[key] === subteam) || subteam}: {percentage as number}%
                                    </li>
                                ))}
                        </ul>
                    ) : (
                        <p className={styles.infoText}>N/A</p>
                    )}

                        {supportingDocs && supportingDocs.length > 0 && (
                            <div className={styles.infoSection}>
                                <h4 className={styles.infoLabel}>Supporting Documents:</h4>
                                <div className={styles.docsContainer}>
                                    {supportingDocs.map((doc, index) => (
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
                </div>}

                <div className={styles.settingsGroup}>
                    {/* Display status and price for the order */}

                    {item && (
                        <>
                            <div className={styles.inputGroup}>
                                <label>Item Name:</label>
                                <p className={styles.infoText}>{item.name}</p>
                            </div>
                            <div className={styles.inputGroup}>
                                <label>Part Number:</label>
                                <p className={status.infoText}>{item.partNumber || 'N/A'}</p>
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
                                    <p>N/A</p>
                                )}
                            </div>
                            <div className={styles.inputGroup}>
                                <label>Quantity:</label>
                                {item.quantity ? <p className={status.infoText}>{item.quantity}</p> : <p>N/A</p>}
                            </div>
                        </>
                    )}

                    <div className={styles.inputGroup}>
                        <label>Status:</label>
                        <select value={status} onChange={handleStatusChange}>
                            {statusOptions.map((option) => (
                                <option key={option} value={option}>
                                    {option.toUpperCase()}
                                </option>
                            ))}
                        </select>
                    </div>

                    {!item && (
                        <div className={styles.inputGroup}>
                            <label>Price:</label>
                            <input
                                type="number"
                                value={price}
                                onChange={handlePriceChange}
                                className={styles.numberInput}
                            />
                        </div>
                    )}
                </div>

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
