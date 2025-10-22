## 1. Upload Delivery Photo for Order

Upload a photo showing where an entire order was delivered.

### Endpoint
```
POST /orders/{orderId}/deliveryPhoto
```

### Parameters
- `orderId` (path parameter, required): The ID of the order

### Request
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Body**: FormData with a `file` field containing the image

### Supported Image Formats
- JPEG (`.jpg`, `.jpeg`)
- PNG (`.png`)
- WebP (`.webp`)

### Example Request (JavaScript/React Native)
```javascript
const formData = new FormData();
formData.append('file', {
  uri: photoUri,
  type: 'image/jpeg',
  name: 'delivery-photo.jpg',
});

const response = await fetch(`https://your-domain.com/api/orders/${orderId}/deliveryPhoto`, {
  method: 'POST',
  body: formData,
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

const data = await response.json();
```

### Success Response (200 OK)
```json
{
  "success": true,
  "url": "https://blob-url.vercel-storage.com/delivery-photos/orders/123/...",
  "orderId": 123
}
```

### Error Responses

**400 Bad Request** - Missing or invalid file
```json
{
  "error": "No file provided"
}
```

**400 Bad Request** - Invalid file type
```json
{
  "error": "Only JPEG, PNG, and WebP images are allowed"
}
```

**404 Not Found** - Order doesn't exist
```json
{
  "error": "Order not found"
}
```

---

## 2. Upload Delivery Photo for Item

Upload a photo showing where a specific item was delivered.

### Endpoint
```
POST /items/{itemId}/deliveryPhoto
```

### Parameters
- `itemId` (path parameter, required): The ID of the item

### Request
- **Method**: `POST`
- **Content-Type**: `multipart/form-data`
- **Body**: FormData with a `file` field containing the image

### Supported Image Formats
- JPEG (`.jpg`, `.jpeg`)
- PNG (`.png`)
- WebP (`.webp`)

### Example Request (JavaScript/React Native)
```javascript
const formData = new FormData();
formData.append('file', {
  uri: photoUri,
  type: 'image/jpeg',
  name: 'delivery-photo.jpg',
});

const response = await fetch(`https://your-domain.com/api/items/${itemId}/deliveryPhoto`, {
  method: 'POST',
  body: formData,
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

const data = await response.json();
```

### Success Response (200 OK)
```json
{
  "success": true,
  "url": "https://blob-url.vercel-storage.com/delivery-photos/items/456/...",
  "itemId": 456
}
```

### Error Responses

**400 Bad Request** - Missing or invalid file
```json
{
  "error": "No file provided"
}
```

**400 Bad Request** - Invalid file type
```json
{
  "error": "Only JPEG, PNG, and WebP images are allowed"
}
```

**404 Not Found** - Item doesn't exist
```json
{
  "error": "Item not found"
}
```

---

## 3. Get Order Delivery Photo

Retrieve the delivery photo URL for a specific order.

### Endpoint
```
GET /orders/{orderId}/deliveryPhoto
```

### Parameters
- `orderId` (path parameter, required): The ID of the order

### Request
- **Method**: `GET`

### Example Request (JavaScript/React Native)
```javascript
const response = await fetch(`https://your-domain.com/api/orders/${orderId}/deliveryPhoto`);
const data = await response.json();

if (data.success) {
  // Display image using data.url
  console.log('Photo URL:', data.url);
}
```

### Success Response (200 OK)
```json
{
  "success": true,
  "url": "https://blob-url.vercel-storage.com/delivery-photos/orders/123/...",
  "orderId": 123
}
```

### Error Responses

**404 Not Found** - Order doesn't exist
```json
{
  "error": "Order not found"
}
```

**404 Not Found** - No photo uploaded yet
```json
{
  "error": "No delivery photo found for this order"
}
```

---

## 4. Get Item Delivery Photo

Retrieve the delivery photo URL for a specific item.

### Endpoint
```
GET /items/{itemId}/deliveryPhoto
```

### Parameters
- `itemId` (path parameter, required): The ID of the item

### Request
- **Method**: `GET`

### Example Request (JavaScript/React Native)
```javascript
const response = await fetch(`https://your-domain.com/api/items/${itemId}/deliveryPhoto`);
const data = await response.json();

if (data.success) {
  // Display image using data.url
  console.log('Photo URL:', data.url);
}
```

### Success Response (200 OK)
```json
{
  "success": true,
  "url": "https://blob-url.vercel-storage.com/delivery-photos/items/456/...",
  "itemId": 456
}
```

### Error Responses

**404 Not Found** - Item doesn't exist
```json
{
  "error": "Item not found"
}
```

**404 Not Found** - No photo uploaded yet
```json
{
  "error": "No delivery photo found for this item"
}
```