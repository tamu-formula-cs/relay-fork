export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { OpenAI } from "openai";

let openai: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
    if (!openai) {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
            throw new Error('OPENAI_API_KEY environment variable is not set');
        }
        openai = new OpenAI({ apiKey });
    }
    return openai;
}

interface OrderDetails {
    meenId: string,
    carrier: string,
    trackingNumber: string,
    orderStatus: string,
    vendorOrderId: string,
    itemName: string,
    vendorName: string
}

async function parseData(query: string): Promise<OrderDetails | null> {

    const schema = {
        meenId: { title: "MEEN Order Id", type: "string" },
        carrier: { title: "Carrier", type: "string" },
        trackingNumber: { title: "Tracking Number", type: "string" },
        orderStatus: { title: "Order Status", type: "string" },
        vendorOrderId: { title: "Vendor ID", type: "string" },
        itemName: { title: "Item Names", type: "string" },
        vendorName: { title: "Vendor Name", type: "string" }
    };

    const jsonSchema = JSON.stringify(schema, null, 4);

    const prompt = `
    Please extract the following details from the provided shipment information. Follow the specific guidelines for each field and ensure that you return **null** if the information is not clearly stated. Do not infer or assume any details. Return the response only in JSON format according to the specified schema.

    ### Required Fields:

    1. **meenId**: 
    - Look for an exact match for the pattern **"MEEN - [3 digit number]"** (e.g., MEEN - 123).
    - If no MEEN ID follows this pattern or is not explicitly mentioned, return **null**.

    2. **Carrier**: 
    - Identify the shipping company (e.g., UPS, FedEx, DHL). Common variations and abbreviations of carrier names can be used (e.g., "FedEx" for "Federal Express").
    - If no carrier name is explicitly mentioned, return **null**.

    3. **Tracking Number**: 
    - Identify the unique tracking number associated with the shipment.
    - If no tracking number is explicitly provided, return **null**.

    4. **Order Status**: 
    - Extract the current status of the order (e.g., Ordered, Shipped, Delivered, In transit).
    - If no clear order status is stated, return **null**.
    - PLEASE RETURN in the form of TO_ORDER, PLACED, MEEN_HOLD, PROCESSED, SHIPPED, AWAITING_PICKUP, DELIVERED, PICKED_UP, and no variation of these (exact spelling).

    5. **Vendor Order Number**: 
    - Look for any unique order number provided by the vendor, often labeled as **Order #** or similar.
    - If no vendor order number is explicitly mentioned, return **null**.

    6. **itemName**: 
    - Provide the exact name of the item as listed in the shipment information.
    - If no item name is mentioned, return **null**.

    7. **Vendor Name**:
        - Extract the vendor's name based on phrases like "Sold by" or "Vendor."
        - If no vendor name is explicitly stated, return **null**.

    ### Important Notes:
    - **Return null** only when the information is **not explicitly present**.
    - Do not provide any additional comments or explanations outside the JSON response.
    - The output must strictly follow the JSON schema.

    Here is the shipment information you need to analyze:

    Return the response **only** as a JSON object.
    `;

    const openaiClient = getOpenAIClient();
    const chat_completion = await openaiClient.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "system",
                content: `You will parse data about shipment information and output in JSON. Only return information what is extracted from the query. \nThe JSON object must use the schema: ${jsonSchema}. Only return the JSON object and no extra text.`,
            },
            {
                role: "user",
                content: prompt + query,
            },
        ],
        temperature: 0,
        max_tokens: 1500,
    });

    let responseContent = chat_completion.choices[0].message.content;

    if (!responseContent) {
        console.error("No content returned from OPENAI API.");
        return null;
    }

    console.log("llm data: ", responseContent);

    // Trim content before and after the JSON object
    const jsonStartIndex = responseContent.indexOf("{");
    const jsonEndIndex = responseContent.lastIndexOf("}") + 1;

    if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
        responseContent = responseContent.substring(jsonStartIndex, jsonEndIndex);
    }

    try {
        const parsedData: OrderDetails = JSON.parse(responseContent);
        return parsedData;
    } catch (error) {
        console.error("Failed to parse JSON: ", error);
        return null;
    }
}

export async function GET(req: NextRequest) {
    try {
        const query = req.nextUrl.searchParams.get('query');

        if (!query) {
            return NextResponse.json({ error: 'Missing query parameter' }, { status: 400 });
        }

        // Check if OpenAI API key is available
        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({
                error: 'OpenAI API key not configured',
                message: 'The LLM service is not available because the OPENAI_API_KEY environment variable is not set.'
            }, { status: 503 });
        }

        const response = await parseData(query);
        return NextResponse.json(response);
    } catch (error) {
        const err = error as Error;
        console.error('Error in LLM API:', err);

        if (err.message.includes('OPENAI_API_KEY')) {
            return NextResponse.json({
                error: 'OpenAI API key not configured',
                message: 'The LLM service is not available.'
            }, { status: 503 });
        }

        return NextResponse.json({ error: 'Internal Server Error', message: err.message }, { status: 500 });
    }
}