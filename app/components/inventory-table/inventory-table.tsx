"use client";

import React, { useState, useMemo, useRef } from 'react';
import styles from './inventory-table.module.css';
import EmptyIcon from "../../../assets/empty.svg";
import DeleteIcon from "../../../assets/delete.svg";
import FilterIcon from "../../../assets/filter.svg";
import Image from 'next/image';
import useSWR, { mutate } from 'swr';
import { SerializedItemsWithRelations } from '../order-table/order-table';
import { StockLevel } from '@prisma/client';

const fetcher = async (url: string) => {
    const res = await fetch(url);
    const data = await res.json();
    const items = data.items.map((item: SerializedItemsWithRelations) => ({
        ...item,
        createdAt: new Date(item.createdAt),
        updatedAt: new Date(item.updatedAt),
    }));
    return { items };
};

const InventoryTable: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [editingItems, setEditingItems] = useState<Record<string, Partial<SerializedItemsWithRelations>>>({});
    const [newItem, setNewItem] = useState<Partial<SerializedItemsWithRelations> | null>(null);
    const [levelFilter, setLevelFilter] = useState<StockLevel | 'ALL'>('ALL')
    const dropdownRef = useRef<HTMLSelectElement>(null);

    const { data, error } = useSWR('/api/items', fetcher, { refreshInterval: 60000 });

    const items = useMemo(() => data?.items as SerializedItemsWithRelations[] || [], [data]);

    const getLevelColorClass = (level: StockLevel) => {
        switch (level) {
            case StockLevel.IN_STOCK:
                return styles.inStock;
            case StockLevel.LOW_STOCK:
                return styles.lowStock;
            case StockLevel.OUT_OF_STOCK:
                return styles.outOfStock;
            default:
                return "";
        }
    };

    const filteredItems = useMemo(() => {
        if (!items) return [];

        const searchFilteredItems = items.filter((item) => {
            if (!searchQuery) return true;

            const query = searchQuery.toLowerCase();
            return (
                item.internalSKU?.toLowerCase().includes(query) ||
                item.name.toLowerCase().includes(query) ||
                item.level?.toLowerCase().includes(query) ||
                item.location?.toLowerCase().includes(query) ||
                item.vendor?.toLowerCase().includes(query) ||
                item.vendorSKU?.toLowerCase().includes(query)
            );
        })

        const levelFilteredItems = levelFilter === 'ALL'
            ? searchFilteredItems
            : searchFilteredItems.filter((item) => item.level === levelFilter);

        return levelFilteredItems.sort((a, b) => {
            if (!a.internalSKU && !b.internalSKU) return 0;
            if (!a.internalSKU) return 1;
            if (!b.internalSKU) return -1;
            return a.internalSKU.localeCompare(b.internalSKU);
        });

    }, [items, searchQuery, levelFilter]);

    if (error) { return <div>Error loading inventory.</div>; }
    if (!data) { return <div>Loading inventory...</div>; }

    const handleEdit = (id: number, field: keyof SerializedItemsWithRelations, value: string) => {
        setEditingItems((prev) => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value,
            },
        }));
    };

    const saveEdit = async (id: number, updatedFields?: Partial<SerializedItemsWithRelations>) => {
        const updatedItem = { ...editingItems[id], ...updatedFields };
        if (!updatedItem) return;

        try {
            await fetch(`/api/items/update/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(updatedItem),
            });

            mutate("/api/items");
            setEditingItems((prev) => {
                const newItems = { ...prev };
                delete newItems[id];
                return newItems;
            });
        } catch (error) {
            console.error("Failed to update item:", error);
            alert("Failed to update item. Please try again.");
        }
    };

    const handleNewItemChange = (field: keyof SerializedItemsWithRelations, value: string) => {
        setNewItem((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const saveNewItem = async () => {
        if (!newItem) return;

        try {
            const response = await fetch(`/api/items/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newItem),
            });

            const data: { message?: string; error?: string } = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Something went wrong');
            }

            console.log("Item created successfully:", data.message);

            mutate("/api/items");
            setNewItem(null);
        } catch (error) {
            if (error instanceof Error) {
                console.error("Failed to create item:", error.message);
                alert(`Error: ${error.message}`);
            } else {
                console.error("An unknown error occurred");
                alert('An unknown error occurred');
            }
        }
    };

    const handleDelete = async (id: number) => {
        const isConfirmed = window.confirm("Are you sure you want to delete this item?");
        if (isConfirmed) {
            try {
                await fetch(`/api/items/delete/${id}`, {
                    method: "DELETE",
                    headers: { "Content-Type": "application/json" },
                });

                mutate("api/items");
            } catch (error) {
                console.error("Failed to delete item:", error);
                alert("Failed to delete item. Please try again.");
            }
        }
    };

    return (
        <div className={styles.tableMainContainer}>
            <div className={styles.tableTop}>
                <h1 className={styles.purchaseHeader}>Inventory</h1>
                <div className={styles.addButtonContainer}>
                    {newItem ? (
                        <button
                            onClick={() => {
                                saveNewItem();
                                setNewItem(null);
                            }}
                            className={styles.addButton}
                        >
                            Save
                        </button>
                    ) : (
                        <button onClick={() => setNewItem({})} className={styles.addButton}>
                            + Add Item
                        </button>
                    )}
                </div>
                <div className={styles.tableSearch}>
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={styles.searchBar}
                    />
                </div>
            </div>
            <div className={styles.tableContainer}>
                <table className={styles.tableBody}>
                    <thead className={styles.tableHeader}>
                        <tr>
                            <th className={`${styles.thText} ${styles.idColumnHeader}`}>Internal SKU</th>
                            <th className={`${styles.thText} ${styles.descriptionColumnHeader}`}>Description</th>
                            <th className={`${styles.thText} ${styles.quantityColumnHeader}`}>Quantity</th>
                            <th className={`${styles.thText} ${styles.levelColumnHeader}`}>
                                Level
                                <div className={styles.filterContainer}>
                                    <select
                                        value={levelFilter}
                                        onChange={(e) => setLevelFilter(e.target.value as StockLevel | 'ALL')}
                                        className={styles.hiddenSelect}
                                        ref={dropdownRef}
                                    >
                                        <option value="ALL">All</option>
                                        {Object.values(StockLevel).map((level) => (
                                            <option key={level} value={level}>
                                                {level.replaceAll('_', ' ')}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => dropdownRef.current?.click()}
                                        className={styles.filterButton}
                                        aria-label="Filter by stock level"
                                    >
                                        <Image
                                            src={FilterIcon}
                                            alt="Filter icon"
                                            width={20}
                                            height={20}
                                        />
                                    </button>
                                </div>
                            </th>
                            <th className={`${styles.thText} ${styles.locationColumnHeader}`}>Location</th>
                            <th className={`${styles.thText} ${styles.vendorColumnHeader}`}>Vendor</th>
                            <th className={`${styles.thText} ${styles.vendorSKUColumnHeader}`}>Vendor SKU</th>
                            <th className={`${styles.thText} ${styles.deleteColumnHeader}`}></th>
                        </tr>
                    </thead>
                    <tbody>
                        {newItem && (
                            <tr className={styles.order}>
                                <td className={`${styles.tableCell} ${styles.tdText} ${styles.idColumn}`}>
                                    <input type="text" onChange={(e) => handleNewItemChange("internalSKU", e.target.value)} className={styles.inputField} />
                                </td>
                                <td className={`${styles.tableCell} ${styles.tdText} ${styles.descriptionColumn}`}>
                                    <input type="text" onChange={(e) => handleNewItemChange("name", e.target.value)} className={styles.inputField} />
                                </td>
                                <td className={`${styles.tableCell} ${styles.tdText}`}>
                                    <input type="text" onChange={(e) => handleNewItemChange("quantity", e.target.value)} className={styles.inputField} />
                                </td>
                                <td className={`${styles.tableCell} ${styles.tdText} ${styles.levelColumn}`}>
                                    <select onChange={(e) => handleNewItemChange("level", e.target.value as StockLevel)} className={styles.selectDropdown}>
                                        {Object.values(StockLevel).map((option) => (
                                            <option key={option} value={option}>
                                                {option.toUpperCase()}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                <td className={`${styles.tableCell} ${styles.tdText} ${styles.locationColumn}`}>
                                    <input type="text" onChange={(e) => handleNewItemChange("location", e.target.value)} className={styles.inputField} />
                                </td>
                                <td className={`${styles.tableCell} ${styles.tdText} ${styles.vendorColumn}`}>
                                    <input type="text" onChange={(e) => handleNewItemChange("vendor", e.target.value)} className={styles.inputField} />
                                </td>
                                <td className={`${styles.tableCell} ${styles.tdText} ${styles.vendorSKUColumn}`}>
                                    <input type="text" onChange={(e) => handleNewItemChange("vendorSKU", e.target.value)} className={styles.inputField} />
                                </td>
                            </tr>
                        )}
                        {filteredItems.map((item) => (
                            <React.Fragment key={item.id}>
                                <tr className={styles.order}>
                                    <td className={`${styles.tableCell} ${styles.tdText} ${styles.idColumn}`}>
                                        <input
                                            type="text"
                                            value={editingItems[item.id]?.internalSKU ?? item.internalSKU ?? ""}
                                            onChange={(e) => handleEdit(item.id, "internalSKU", e.target.value)}
                                            onBlur={() => saveEdit(item.id)}
                                            className={styles.inputField}
                                        />
                                    </td>
                                    <td className={`${styles.tableCell} ${styles.tdText} ${styles.descriptionColumn}`}>
                                        <input
                                            type="text"
                                            value={editingItems[item.id]?.name ?? item.name ?? ""}
                                            onChange={(e) => handleEdit(item.id, "name", e.target.value)}
                                            onBlur={() => saveEdit(item.id)}
                                            className={styles.inputField}
                                        />
                                    </td>
                                    <td className={`${styles.tableCell} ${styles.tdText}`}>
                                        <input
                                            type="text"
                                            value={editingItems[item.id]?.quantity ?? item.quantity ?? ""}
                                            onChange={(e) => handleEdit(item.id, "quantity", e.target.value)}
                                            onBlur={() => saveEdit(item.id)}
                                            className={styles.inputField}
                                        />
                                    </td>
                                    <td className={`${styles.tableCell} ${styles.tdText} ${styles.levelColumn}`}>
                                        <select
                                            value={editingItems[item.id]?.level ?? item.level ?? StockLevel.IN_STOCK}
                                            onChange={(e) => {
                                                const newLevel = e.target.value as StockLevel;
                                                handleEdit(item.id, "level", newLevel);
                                                saveEdit(item.id, { level: newLevel });
                                            }}
                                            className={`${styles.selectDropdown} ${getLevelColorClass(editingItems[item.id]?.level ?? item.level ?? StockLevel.IN_STOCK)}`}
                                        >
                                            {Object.values(StockLevel).map((option) => (
                                                <option key={option} value={option}>
                                                    {option.replaceAll('_', ' ')}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className={`${styles.tableCell} ${styles.tdText} ${styles.locationColumn}`}>
                                        <input
                                            type="text"
                                            value={editingItems[item.id]?.location ?? item.location ?? ""}
                                            onChange={(e) => handleEdit(item.id, "location", e.target.value)}
                                            onBlur={() => saveEdit(item.id)}
                                            className={styles.inputField}
                                        />
                                    </td>
                                    <td className={`${styles.tableCell} ${styles.tdText} ${styles.vendorColumn}`}>
                                        <input
                                            type="text"
                                            value={editingItems[item.id]?.vendor ?? item.vendor ?? ""}
                                            onChange={(e) => handleEdit(item.id, "vendor", e.target.value)}
                                            onBlur={() => saveEdit(item.id)}
                                            className={styles.inputField}
                                        />
                                    </td>
                                    <td className={`${styles.tableCell} ${styles.tdText} ${styles.vendorSKUColumn}`}>
                                        <input
                                            type="text"
                                            value={editingItems[item.id]?.vendorSKU ?? item.vendorSKU ?? ""}
                                            onChange={(e) => handleEdit(item.id, "vendorSKU", e.target.value)}
                                            onBlur={() => saveEdit(item.id)}
                                            className={styles.inputField}
                                        />
                                    </td>
                                    <td className={`${styles.tableCell} ${styles.tdText} ${styles.deleteColumn}`}>
                                        <Image
                                            aria-label={`Delete item ${item.id}`}
                                            onClick={() => handleDelete(item.id)}
                                            src={DeleteIcon}
                                            alt="Delete icon"
                                            width={20}
                                            height={20}
                                        />
                                    </td>
                                </tr>
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {filteredItems.length === 0 && (
                <div className={styles.emptyState}>
                    <p>No inventory to show.</p>
                    <p>Looks like nothing&apos;s here!</p>
                    <Image
                        src={EmptyIcon.src}
                        height={100}
                        width={100}
                        alt="No inventory"
                    />
                </div>
            )}
        </div>
    );
};

export default InventoryTable;