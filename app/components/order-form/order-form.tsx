import { useState, useRef } from 'react';
import styles from './order-form.module.css';
import CloseIcon from "../../../assets/close.svg"
import Image from 'next/image';
import { mutate } from 'swr';
import { useToast } from '../toast/use-toast';
import { upload } from '@vercel/blob/client';

interface OrderFormProps {
    onClose: () => void;
}

interface OrderData {
    orderName: string;
    vendor: string;
    notes: string;
    estimatedCost: number;
    costBreakdown: {
        AERO: number;
        CHS: number;
        SUS: number;
        BAT: number;
        ECE: number;
        PT: number;
    };
    supportingDocs: { name: string; url: string }[];
}

export default function OrderForm({ onClose }: OrderFormProps) {
    const { toast } = useToast();

    const [currentScreen, setCurrentScreen] = useState(0);
    const [orderData, setOrderData] = useState<OrderData>({
        orderName: '',
        vendor: '',
        notes: '',
        estimatedCost: 0,
        costBreakdown: {
            AERO: 0,
            CHS: 0,
            SUS: 0,
            BAT: 0,
            ECE: 0,
            PT: 0,
        },
        supportingDocs: [],
    });

    const handleNext = () => setCurrentScreen(currentScreen + 1);
    const handleBack = () => setCurrentScreen(currentScreen - 1);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setOrderData({ ...orderData, [name]: value });
    };

    const handleCostBreakdownChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setOrderData({
            ...orderData,
            costBreakdown: { ...orderData.costBreakdown, [name]: Number(value) },
        });
    };

    const handleSubmitCSV = async (file: File) => {
        const totalCostPercentage = Object.values(orderData.costBreakdown).reduce((a, b) => a + b, 0);
        if (totalCostPercentage !== 100) {
            toast({
                title: "Invalid Cost Breakdown",
                description: "Cost breakdown percentages must add up to 100%",
                variant: "destructive",
            });
            return;
        }
    
        const formData = new FormData();
        formData.append('file', file);
        formData.append('orderName', orderData.orderName);
        formData.append('vendor', orderData.vendor);
        formData.append('notes', orderData.notes);
        formData.append('estimatedCost', String(orderData.estimatedCost));
    
        for (const [key, value] of Object.entries(orderData.costBreakdown)) {
            formData.append(`costBreakdown[${key}]`, String(value));
        }
    
        orderData.supportingDocs.forEach((doc, index) => {
            formData.append(`supportingDocs[${index}][name]`, doc.name);
            formData.append(`supportingDocs[${index}][url]`, doc.url);
        });
    
        try {
            const response = await fetch('/api/orders/upload', {
                method: 'POST',
                body: formData,
            });
    
            if (response.ok) {
                toast({
                    title: "Order Created",
                    description: "Order created successfully!",
                    variant: "affirmation",
                });
                mutate('/api/orders');
                onClose();
            } else {
                const errorData = await response.json();
                toast({
                    title: "Error",
                    description: `Error: ${errorData.error}`,
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Upload error:', error);
            toast({
                title: "Upload Error",
                description: "An error occurred while uploading the file.",
                variant: "destructive",
            });
        }
    };    

    const onNextStep = (index: number) => {
        setCurrentScreen(index);
    };

    const screens = [
        <GeneralInfoScreen
            orderData={orderData}
            setOrderData={setOrderData}
            onInputChange={handleInputChange}
            onNext={handleNext}
            onClose={onClose}
        />,
        <CostBreakdownScreen
            costBreakdown={orderData.costBreakdown}
            onCostChange={handleCostBreakdownChange}
            onNext={handleNext}
            onBack={handleBack}
            onClose={onClose}
        />,
        <Method
            orderData={orderData}
            handleSubmitCSV={handleSubmitCSV}
            onBack={handleBack}
            onClose={onClose}
            onNextStep={onNextStep}
        />,
        <CartLinkOrder
            orderData={orderData}
            onBack={() => setCurrentScreen(2)}
            onClose={onClose}
        />,
        <SingleItemOrder
            orderData={orderData}
            onBack={() => setCurrentScreen(2)}
            onClose={onClose}
        />,
    ];

    return screens[currentScreen];
}

function GeneralInfoScreen({ orderData, onInputChange, onNext, onClose, setOrderData }: any) {
    const isNextDisabled = !orderData.orderName || !orderData.vendor || orderData.estimatedCost <= 0;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadedFiles, setUploadedFiles] = useState<{ name: string; url: string }[]>([]);
    const { toast } = useToast();

    const handleNextClick = () => {
        if (isNextDisabled) {
            toast({
                title: "Incomplete Information",
                description: "Please fill in the order name, vendor, and estimated cost to continue.",
                variant: "destructive",
            });
        } else {
            onNext();
        }
    };

    const handleFileUpload = async () => {
        const file = fileInputRef.current?.files?.[0];
        if (!file || file.type !== 'application/pdf') {
            toast({
                title: "Invalid File",
                description: "Please upload a valid PDF file.",
                variant: "destructive",
            });
            return;
        }
        
        setUploading(true);
    
        try {
            const { url } = await upload(file.name, file, {
                access: 'public',
                handleUploadUrl: '/api/orders/addAttachment',
            });

            const newFile = { name: file.name, url };
    
            setOrderData((prevData) => ({
                ...prevData,
                supportingDocs: [...prevData.supportingDocs, { name: file.name, url }],
            }));

            setUploadedFiles((prevFiles) => [...prevFiles, newFile]);
    
            toast({
                title: "File Uploaded",
                description: "Your PDF was successfully uploaded.",
                variant: "affirmation",
            });
        } catch (error) {
            console.error('Upload error:', error);
            toast({
                title: "Upload Error",
                description: "An error occurred while uploading the PDF.",
                variant: "destructive",
            });
        } finally {
            setUploading(false);
        }
    };
    
    

    return (
        <div className={styles.formBG}>
            <div className={styles.formContainer}>
                <div className={styles.formHeader}>
                    <h1 className={styles.formTitle}>Order Form</h1>
                    <button className={styles.closeButton} onClick={onClose}>
                        <Image src={CloseIcon.src} height={10} width={10} alt='close'/>
                    </button>
                </div>
                <p className={styles.formParagraph}>General Info</p>
                <div className={styles.generalRowOne}>
                    <div className={styles.inputGroup}>
                        <label>Order Name (Main Item)*</label>
                        <input
                            type="text"
                            name="orderName"
                            placeholder="Order Name"
                            value={orderData.orderName}
                            onChange={onInputChange}
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label>Vendor Name*</label>
                        <input
                            type="text"
                            name="vendor"
                            placeholder="Vendor Name"
                            value={orderData.vendor}
                            onChange={onInputChange}
                        />
                    </div>
                </div>
                <div className={styles.generalRowTwo}>
                    <div className={styles.inputGroup}>
                        <label>Estimated Total Cost*</label>
                        <input
                            type="number"
                            name="estimatedCost"
                            placeholder="Estimated Cost"
                            value={orderData.estimatedCost}
                            onChange={onInputChange}
                        />
                    </div>
                    <div className={styles.inputGroup}>
                        <label>Notes (optional)</label>
                        <textarea
                            name="notes"
                            placeholder="Notes"
                            value={orderData.notes}
                            onChange={onInputChange}
                            className={styles.textarea}
                        />
                    </div>
                </div>
                <div className={styles.buttonGroup}>
                    <div className={styles.uploadedFilesContainer}>
                        {uploadedFiles.map((file, index) => (
                            <div key={index} className={styles.uploadedFile}>
                                <span className={styles.fileIcon}>📄</span> {/* Simple icon */}
                                <a href={file.url} target="_blank" rel="noopener noreferrer" className={styles.fileLink}>
                                    {file.name}
                                </a>
                            </div>
                        ))}
                    </div>
                    <div className={styles.uploadButtonContainer}>
                        <button className={`${styles.backButton} ${styles.uploadButton}`} onClick={() => fileInputRef.current?.click()}>
                            Upload PDF
                        </button>
                        <input
                            type="file"
                            accept="application/pdf"
                            ref={fileInputRef}
                            className={styles.fileInput}
                            onChange={handleFileUpload}
                        />
                    </div>
                    <button className={styles.nextButton} onClick={handleNextClick}>
                        Next Step
                    </button>
                </div>
            </div>
        </div>
    );
}

function CostBreakdownScreen({ costBreakdown, onCostChange, onNext, onBack, onClose }: any) {
    const totalPercentage = Object.values(costBreakdown).reduce((a, b) => (a as number) + (b as number), 0);
    const isNextDisabled = totalPercentage !== 100;

    const { toast } = useToast();

    const handleNextClick = () => {
        if (isNextDisabled) {
            toast({
                title: "Incomplete Information",
                description: "Please make sure the cost breakdown adds up to 100%.",
                variant: "destructive",
            });
        } else {
            onNext();
        }
    };

    return (
        <div className={styles.formBG}>
            <div className={styles.formContainer}>
                <div className={styles.formHeader}>
                    <h1 className={styles.formTitle}>Order Form</h1>
                    <button className={styles.closeButton} onClick={onClose}>
                        <Image src={CloseIcon.src} height={10} width={10} alt='close'/>
                    </button>
                </div>
                <p className={styles.formParagraph}>Cost Breakdown (Must add up to 100%)</p>
                <div className={styles.costBreakdownRow}>
                    {['AERO', 'CHS', 'SUS', 'BAT', 'ECE', 'PT'].map((subteam) => (
                        <div key={subteam} className={styles.inputGroup}>
                            <label>Order Cost Percentage ({subteam})</label>
                            <input
                                type="number"
                                name={subteam}
                                placeholder="0%"
                                value={costBreakdown[subteam]}
                                onChange={onCostChange}
                            />
                        </div>
                    ))}
                </div>
                <div className={styles.buttonGroup}>
                    <button className={styles.backButton} onClick={onBack}>Back</button>
                    <button className={styles.nextButton} onClick={handleNextClick}>Next</button>
                </div>
            </div>
        </div>
    );
}

function Method({ orderData, handleSubmitCSV, onNextStep, onBack, onClose }: any) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();
    
    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.name.endsWith('.csv')) {
            await handleSubmitCSV(file);
        } else {
            toast({
                title: "Invalid File",
                description: "Please upload a valid CSV file.",
                variant: "destructive",
            });
        }
    };

    return (
        <div className={styles.formBG}>
            <div className={`${styles.formContainer} ${styles.formContainerSmall}`}>
                <div className={styles.formHeader}>
                    <h1 className={styles.formTitle}>Order Form</h1>
                    <button className={styles.closeButton} onClick={onClose}>
                        <Image src={CloseIcon.src} height={10} width={10} alt='close'/>
                    </button>
                </div>

                <p className={styles.formParagraph}>How do you want to submit this order?</p>
                <div className={`${styles.buttonGroup} ${styles.methodButtonGroup}`}>
                    <button
                        className={styles.nextButton}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        Upload CSV
                    </button>
                    <input
                        type="file"
                        accept=".csv"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />
                    <button className={styles.nextButton} onClick={() => onNextStep(3)}>Cart Link</button>
                    <button className={styles.nextButton} onClick={() => onNextStep(4)}>Single Item</button>
                </div>
                <button className={styles.backButton} onClick={onBack}>Back</button>
            </div>
        </div>
    );
}

function CartLinkOrder({ orderData, onBack, onClose }: any) {
    const [cartLink, setCartLink] = useState('');
    const { toast } = useToast();
    const handleSubmit = async () => {
        if (!cartLink) {
            toast({
                title: "Missing Cart Link",
                description: "Please provide a cart link.",
                variant: "destructive",
            });
            return;
        }

        const cartOrderData = {
            ...orderData,
            cartUrl: cartLink,
            comments: orderData.notes,
            costBreakdown: orderData.costBreakdown,
            supportingDocs: orderData.supportingDocs,
        };

        try {
            const response = await fetch('/api/orders/place', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(cartOrderData),
            });

            if (response.ok) {
                toast({
                    title: "Order Created",
                    description: "Order created successfully!",
                    variant: "affirmation",
                });
                mutate('/api/orders');
                onClose();
            } else {
                const error = await response.json();
                toast({
                    title: "Submission Error",
                    description: `Error: ${error.error}`,
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Error submitting cart link order:', error);
            alert('An error occurred while submitting the order.');
        }
    };

    return (
        <div className={styles.formBG}>
            <div className={`${styles.formContainer} ${styles.formContainerSmall}`}>
                <div className={styles.formHeader}>
                    <h1 className={styles.formTitle}>Cart Link Order</h1>
                    <button className={styles.closeButton} onClick={onClose}>
                        <Image src={CloseIcon.src} height={10} width={10} alt='close'/>
                    </button>
                </div>
                <div className={`${styles.inputGroup} ${styles.singleLink}`}>
                    <label>Link to Shopping Cart*</label>
                    <input
                        type="text"
                        placeholder="www.example.com"
                        value={cartLink}
                        onChange={(e) => setCartLink(e.target.value)}
                    />
                </div>
                <div className={styles.buttonGroup}>
                    <button className={styles.backButton} onClick={onBack}>Back</button>
                    <button className={styles.nextButton} onClick={handleSubmit}>Submit</button>
                </div>
            </div>
        </div>
    );
}

function SingleItemOrder({ orderData, onBack, onClose }: any) {
    const [name, setName] = useState('');
    const [partNumber, setPartNumber] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [cost, setCost] = useState(0);
    const [link, setLink] = useState('');
    const { toast } = useToast();
    
    const handleSubmit = async () => {
        if (!name || !quantity || !cost) {
            toast({
                title: "Missing Fields",
                description: "Please fill in all required fields.",
                variant: "destructive",
            });
            return;
        }

        const singleOrderData = {
            ...orderData,
            totalCost: cost * quantity,
            items: [
                {
                    itemName: name,
                    partNumber,
                    quantity,
                    cost,
                    link,
                },
            ],
            comments: orderData.notes,
            costBreakdown: orderData.costBreakdown,
            supportingDocs: orderData.supportingDocs,
        };

        try {
            const response = await fetch('/api/orders/place', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(singleOrderData),
            });

            if (response.ok) {
                toast({
                    title: "Order Created",
                    description: "Order created successfully!",
                    variant: "affirmation",
                });
                mutate('/api/orders');
                onClose();
            } else {
                const error = await response.json();
                toast({
                    title: "Submission Error",
                    description: `Error: ${error.error}`,
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error('Error submitting single item order:', error);
            alert('An error occurred while submitting the order.');
        }
    };

    return (
        <div className={styles.formBG}>
            <div className={styles.formContainer}>
                <div className={styles.formHeader}>
                    <h1 className={styles.formTitle}>Single Item Order</h1>
                    <button className={styles.closeButton} onClick={onClose}>
                        <Image src={CloseIcon.src} height={10} width={10} alt='close'/>
                    </button>
                </div>
                <p className={styles.formParagraph}>Item info</p>
                <div className={styles.generalRowOne}>
                    <div className={styles.inputGroup}>
                        <label>Item Name*</label>
                        <input type="text" placeholder="Item Name" value={name} onChange={(e) => setName(e.target.value)} />
                    </div>
                    <div className={styles.inputGroup}>
                        <label>Part Number</label>
                        <input type="text" placeholder="Part Number" value={partNumber} onChange={(e) => setPartNumber(e.target.value)} />
                    </div>
                </div>
                <div className={styles.generalRowTwo}>
                    <div className={styles.inputGroup}>
                        <label>Quantity*</label>
                        <input type="number" placeholder="Quantity" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} />
                    </div>
                    <div className={styles.inputGroup}>
                        <label>Cost (Per Item)*</label>
                        <input type="number" placeholder="Cost" value={cost} onChange={(e) => setCost(Number(e.target.value))} />
                    </div>
                </div>
                <div className={styles.generalRowThree}>
                    <div className={styles.inputGroup}>
                        <label>Link to Item</label>
                        <input type="text" placeholder="Link to Item" value={link} onChange={(e) => setLink(e.target.value)} />
                    </div>
                </div>
                <div className={styles.buttonGroup}>
                    <button className={styles.backButton} onClick={onBack}>Back</button>
                    <button className={styles.nextButton} onClick={handleSubmit}>Submit</button>
                </div>
            </div>
        </div>
    );
}