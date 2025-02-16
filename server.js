const express = require('express');
const cors = require('cors');
const pool = require('./db');

const app = express();

const { v4: uuidv4 } = require('uuid'); // Import the uuid library

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase payload size limit

const PORT = process.env.PORT || 5000;

// Get all inventory items
app.get('/items', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM inventory');
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
  }
});

// Get a single item by QR Code
app.get('/items/:qr_code', async (req, res) => {
  try {
    const { qr_code } = req.params;
    const result = await pool.query('SELECT * FROM inventory WHERE qr_code = $1', [qr_code]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Add a new item
app.post('/items', async (req, res) => {
  try {
    const { name, quantity, qr_code, description, image_url } = req.body;

    // Log the received data to confirm it's correctly received
    console.log('Received Data:', { name, quantity, qr_code, description, image_url });

    // If no QR code is provided, generate one using uuid
    let finalQrCode = qr_code.trim() === '' ? uuidv4() : qr_code;

    // Check if a product with the same QR code already exists
    const existingProduct = await pool.query('SELECT * FROM inventory WHERE qr_code = $1', [finalQrCode]);

    // If the QR code already exists, generate a new one
    while (existingProduct.rows.length > 0) {
      finalQrCode = uuidv4(); // Generate a new unique QR Code
      const newCheck = await pool.query('SELECT * FROM inventory WHERE qr_code = $1', [finalQrCode]);
      if (newCheck.rows.length === 0) {
        break;
      }
    }

    // Insert the new product with the generated or provided QR code
    const result = await pool.query(
      'INSERT INTO inventory (name, quantity, qr_code, description, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [name, quantity, finalQrCode, description, image_url]
    );

    console.log('Inserted Product:', result.rows[0]);  // Log the inserted data to verify it

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error inserting data:', err.message);
    res.status(500).send('Server error');
  }
});

// Update item
app.put('/items/:qr_code', async (req, res) => {
  try {
    const { qr_code } = req.params;
    const { name, quantity, description, image_url } = req.body;

    // Log the received data to confirm it's correctly received
    console.log('Updating Product:', { qr_code, name, quantity, description, image_url });

    const result = await pool.query(
      'UPDATE inventory SET name = $1, quantity = $2, description = $3, image_url = $4 WHERE qr_code = $5 RETURNING *',
      [name, quantity, description, image_url, qr_code]
    );

    // Check if we actually updated anything
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Product not found!' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating product:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete item
app.delete('/items/:qr_code', async (req, res) => {
  try {
    const { qr_code } = req.params;
    await pool.query('DELETE FROM inventory WHERE qr_code = $1', [qr_code]);
    res.json({ message: 'Item deleted' });
  } catch (err) {
    console.error('Error deleting item:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});