import { ItemStatus, PrismaClient, StockLevel } from '@prisma/client';
import fs from 'fs';
import Papa from 'papaparse';

const prisma = new PrismaClient();

async function importData(filePath) {
    const fileContent = fs.readFileSync(filePath, 'utf8');

    const parsedData = Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
    });

    if (parsedData.errors.length > 0) {
        console.error('CSV Parsing Errors:', parsedData.errors);
        return;
    }

    const mapStockLevel = (level) => {
        const normalized = level.toLowerCase().replace(/\s/g, '_');
        switch (normalized) {
            case 'in_stock':
                return StockLevel.IN_STOCK;
            case 'low_stock':
                return StockLevel.LOW_STOCK;
            case 'out_of_stock':
                return StockLevel.OUT_OF_STOCK;
        }
    };

    const items = parsedData.data.map((row) => ({
        internalItemId: `ITEM-${Math.floor(Math.random() * 1000000)}`,
        internalSKU: row['Internal SKU'],
        name: row['Description'],
        quantity: parseInt(row['Qty'], 10) || null,
        level: mapStockLevel(row['Level']),
        location: row['Location'] || null,
        vendor: row['Vendor'] || null,
        vendorSKU: row['Vendor SKU'] || null,
        status: ItemStatus.PICKED_UP,
    }));

    try {
        await prisma.$transaction(
            items.map((data) => prisma.item.create({ data }))
        );
        console.log('All records inserted successfully!');
    } catch (error) {
        console.error('Error inserting records, transaction rolled back:', error);
    } finally {
        await prisma.$disconnect();
    }
}

importData('IMS(Inventory).csv');