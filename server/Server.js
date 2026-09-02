const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Connect to your MySQL database
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'your_database_password', // Replace with your actual database password
    database: 'fdms_db'
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to SQL Database!');
});

// Login Endpoint
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    
    // Query your users table to find a matching email and password
    const query = 'SELECT * FROM users WHERE email = ? AND password = ?';
    
    db.query(query, [email, password], (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (results.length > 0) {
            // User found! Send back their name and role
            const user = results[0];
            res.json({ 
                success: true, 
                message: 'Login successful', 
                name: user.name, 
                role: user.role 
            });
        } else {
            // No match found
            res.status(401).json({ success: false, message: 'Invalid email or password' });
        }
    });
});

app.listen(3000, () => {
    console.log('Server running on port 3000');
});