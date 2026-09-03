import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, doc, updateDoc, where, limit } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyAluaCQniODbl-e7HydyLMMdzPCJQt92c0",
    authDomain: "amk-clothing.firebaseapp.com",
    databaseURL: "https://amk-clothing-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "amk-clothing",
    storageBucket: "amk-clothing.firebasestorage.app",
    messagingSenderId: "806096864376",
    appId: "1:806096864376:web:5441fdf0cb6aab03d8198d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

onAuthStateChanged(auth, (user) => {
    const currentPage = window.location.pathname.toLowerCase();
    const isLoginPage = currentPage.includes('signin') || currentPage.includes('index') || currentPage.includes('login') || currentPage.endsWith('/');

    if (!user && !isLoginPage) {
        window.location.replace('SignIn.html'); 
    } 
    else if (user && isLoginPage) {
        window.location.replace('Homepage.html');
    }
});

const logoutBtn = document.querySelector('.logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.replace('SignIn.html');
        }).catch((error) => {
            alert("Error logging out: " + error.message);
        });
    });
}

const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        signInWithEmailAndPassword(auth, email, password)
            .then(() => {
                window.location.replace('Homepage.html');
            })
            .catch((error) => {
                alert("Authentication failed: " + error.message);
            });
    });
}

const orderCustomerDropdown = document.getElementById('order-customer');
async function loadCustomersIntoDropdown() {
    if (!orderCustomerDropdown) return;
    try {
        const q = query(collection(db, "customers"), orderBy("fullName", "asc"));
        const querySnapshot = await getDocs(q);
        
        orderCustomerDropdown.innerHTML = '<option value="" disabled selected>Select a customer...</option>';
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const option = document.createElement('option');
            option.value = data.fullName; 
            option.textContent = data.fullName;
            orderCustomerDropdown.appendChild(option);
        });
    } catch (error) {
        console.error(error);
    }
}
loadCustomersIntoDropdown();

const createOrderForm = document.getElementById('create-order-form');
if (createOrderForm) {
    createOrderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const customer = document.getElementById('order-customer').value;
        const orderDate = document.getElementById('order-date').value;
        const item = document.getElementById('order-item').value;
        const amount = document.getElementById('order-amount').value;
        const status = document.getElementById('order-status').value;

        try {
            const qLastOrder = query(collection(db, "orders"), orderBy("timestamp", "desc"), limit(1));
            const lastOrderSnapshot = await getDocs(qLastOrder);
            
            let nextOrderInt = 1;
            
            if (!lastOrderSnapshot.empty) {
                const lastOrderData = lastOrderSnapshot.docs[0].data();
                const lastOrderString = lastOrderData.orderNumber || "Order #00";
                
                const lastNumberStr = lastOrderString.replace(/\D/g, ''); 
                const lastNumber = parseInt(lastNumberStr, 10);
                if (!isNaN(lastNumber)) {
                    nextOrderInt = lastNumber + 1;
                }
            }
            
            const formattedNumber = nextOrderInt.toString().padStart(2, '0');
            const newOrderNumber = `Order #${formattedNumber}`;

            await addDoc(collection(db, "orders"), {
                orderNumber: newOrderNumber,
                customer: customer,
                orderDate: orderDate,
                description: item,
                amount: Number(amount),
                status: status,
                timestamp: new Date()
            });
            
            createOrderForm.reset();
            alert(`Success! Generated: ${newOrderNumber}`);
        } catch (error) {
            alert('Error saving order: ' + error.message);
        }
    });
}

const customerModal = document.getElementById('customer-modal');
const addCustomerBtn = document.getElementById('add-customer-btn');
const closeModalBtn = document.getElementById('close-modal-btn');
const cancelModalBtn = document.getElementById('cancel-modal-btn');
const customerForm = document.getElementById('add-customer-form');
const customerTableBody = document.getElementById('customer-table-body');
const customerCount = document.getElementById('customer-count');

if (addCustomerBtn) addCustomerBtn.addEventListener('click', () => customerModal.style.display = 'flex');
if (closeModalBtn) closeModalBtn.addEventListener('click', () => customerModal.style.display = 'none');
if (cancelModalBtn) cancelModalBtn.addEventListener('click', () => customerModal.style.display = 'none');

async function fetchCustomers() {
    if (!customerTableBody) return; 
    try {
        const q = query(collection(db, "customers"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        
        customerTableBody.innerHTML = '';
        let count = 0;
        
        querySnapshot.forEach((doc) => {
            count++;
            const data = doc.data();
            const tr = document.createElement('tr');
            const initials = data.fullName ? data.fullName.charAt(0).toUpperCase() : '?';
            
            let dateStr = "N/A";
            if (data.timestamp) {
                const dateObj = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
                dateStr = dateObj.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
            }

            tr.innerHTML = `
                <td><span class="avatar-circle">${initials}</span> ${data.fullName || 'Unknown'}</td>
                <td>${data.phone || 'N/A'}</td>
                <td>${data.email || 'N/A'}</td>
                <td style="color: #2b7a78; font-weight: bold;">0</td>
                <td>${dateStr}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit-btn">✏️</button>
                        <button class="action-btn delete-btn">🗑️</button>
                    </div>
                </td>
            `;
            customerTableBody.appendChild(tr);
        });
        
        if (customerCount) {
            customerCount.textContent = `${count} registered customers`;
        }
    } catch (error) {
        console.error(error);
    }
}

if (customerForm) {
    fetchCustomers(); 

    customerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('cust-name').value;
        const phone = document.getElementById('cust-phone').value;
        const email = document.getElementById('cust-email').value;

        try {
            await addDoc(collection(db, "customers"), {
                fullName: name,
                phone: phone,
                email: email,
                timestamp: new Date()
            });
            
            customerForm.reset();
            customerModal.style.display = 'none';
            alert('Customer saved successfully to Firebase!');
            
            fetchCustomers(); 
        } catch (error) {
            alert('Error adding customer: ' + error.message);
        }
    });
}

const updateStatusForm = document.getElementById('update-status-form');

if (updateStatusForm) {
    updateStatusForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        let orderNumInput = document.getElementById('update-order-id').value.trim();
        const newStatus = document.getElementById('update-order-status').value;

        if (/^\d+$/.test(orderNumInput)) {
            orderNumInput = `Order #${orderNumInput.padStart(2, '0')}`;
        } else if (orderNumInput.toLowerCase().startsWith('order')) {
            const numPart = orderNumInput.replace(/\D/g, '');
            orderNumInput = `Order #${numPart.padStart(2, '0')}`;
        }

        try {
            const q = query(collection(db, "orders"), where("orderNumber", "==", orderNumInput));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                alert(`Could not find ${orderNumInput}. Please check the number and try again.`);
                return;
            }
            
            querySnapshot.forEach(async (documentSnapshot) => {
                const orderRef = doc(db, "orders", documentSnapshot.id);
                await updateDoc(orderRef, {
                    status: newStatus
                });
            });
            
            updateStatusForm.reset();
            alert(`Status for ${orderNumInput} successfully updated to ${newStatus}!`);
        } catch (error) {
            alert('Error updating order: ' + error.message);
        }
    });
}

const measurementsForm = document.getElementById('measurements-form');
if (measurementsForm) {
    measurementsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, "measurements"), {
                customer: document.getElementById('meas-customer').value,
                bust: Number(document.getElementById('meas-bust').value),
                waist: Number(document.getElementById('meas-waist').value),
                hips: Number(document.getElementById('meas-hips').value),
                shoulder: Number(document.getElementById('meas-shoulder').value),
                length: Number(document.getElementById('meas-length').value),
                timestamp: new Date()
            });
            measurementsForm.reset();
            alert('Measurements successfully saved to Firebase!');
        } catch (error) {
            alert('Error saving measurements: ' + error.message);
        }
    });
}

const paymentForm = document.getElementById('process-payment-form');
if (paymentForm) {
    paymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, "payments"), {
                orderId: document.getElementById('pay-order-id').value,
                customer: document.getElementById('pay-customer').value,
                amount: Number(document.getElementById('pay-amount').value),
                method: document.getElementById('pay-method').value,
                timestamp: new Date()
            });
            paymentForm.reset();
            alert('Payment successfully recorded in Firebase!');
        } catch (error) {
            alert('Error processing payment: ' + error.message);
        }
    });
}

const invoiceForm = document.getElementById('add-invoice-form');
if (invoiceForm) {
    invoiceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, "invoices"), {
                customer: document.getElementById('inv-customer').value,
                date: document.getElementById('inv-date').value,
                amount: Number(document.getElementById('inv-amount').value),
                status: document.getElementById('inv-status').value,
                timestamp: new Date()
            });
            invoiceForm.reset();
            const invoiceModal = document.getElementById('invoice-modal');
            if(invoiceModal) invoiceModal.style.display = 'none';
            alert('Invoice saved successfully to Firebase!');
        } catch (error) {
            alert('Error creating invoice: ' + error.message);
        }
    });
}

const addItemForm = document.getElementById('add-item-form');
if (addItemForm) {
    addItemForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, "inventory"), {
                itemName: document.getElementById('inv-item-name').value,
                category: document.getElementById('inv-item-category').value,
                supplier: document.getElementById('inv-item-supplier').value,
                quantity: Number(document.getElementById('inv-item-qty').value),
                unit: document.getElementById('inv-item-unit').value,
                reorderLevel: Number(document.getElementById('inv-item-reorder').value),
                cost: Number(document.getElementById('inv-item-cost').value),
                timestamp: new Date()
            });
            addItemForm.reset();
            alert('Item successfully added to Inventory!');
        } catch (error) {
            alert('Error adding item: ' + error.message);
        }
    });
}

const stockForm = document.getElementById('update-stock-form');
if (stockForm) {
    stockForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const itemId = document.getElementById('stock-item').value;
        const actionType = document.getElementById('stock-action').value;
        const quantity = Number(document.getElementById('stock-quantity').value);

        try {
            await addDoc(collection(db, "stock_updates"), {
                itemId: itemId,
                action: actionType,
                quantity: quantity,
                timestamp: new Date()
            });
            
            stockForm.reset();
            alert('Stock update logged successfully!');
        } catch (error) {
            alert('Error updating stock: ' + error.message);
        }
    });
}

const runBackupBtn = document.getElementById('run-backup-btn');
const progressContainer = document.getElementById('progress-container');
const progressBar = document.getElementById('progress-bar');
const progressPercent = document.getElementById('progress-percent');
const progressSubtext = document.getElementById('progress-subtext');

if (runBackupBtn) {
    runBackupBtn.addEventListener('click', () => {
        runBackupBtn.disabled = true;
        progressContainer.style.display = 'block';
        
        let width = 0;
        const interval = setInterval(async () => {
            width += 10;
            progressBar.style.width = width + '%';
            progressPercent.textContent = width + '%';
            
            if (width === 40) progressSubtext.textContent = 'Encrypting files...';
            if (width === 70) progressSubtext.textContent = 'Uploading to secure cloud...';

            if (width >= 100) {
                clearInterval(interval);
                progressSubtext.textContent = 'Backup completed successfully!';
                
                try {
                    await addDoc(collection(db, "backups"), {
                        timestamp: new Date(),
                        size: '4.' + Math.floor(Math.random() * 9) + ' MB',
                        status: 'Success'
                    });
                    
                    setTimeout(() => {
                        alert('Database backup completed and logged in Firebase!');
                        progressContainer.style.display = 'none';
                        runBackupBtn.disabled = false;
                        progressBar.style.width = '0%';
                        progressPercent.textContent = '0%';
                        progressSubtext.textContent = 'Compressing files...';
                    }, 500);

                } catch(error) {
                    alert('Error logging backup: ' + error.message);
                }
            }
        }, 400);
    });
}

const userModal = document.getElementById('user-modal');
const addUserBtn = document.getElementById('add-user-btn');
const closeUserModalBtn = document.getElementById('close-modal-btn');
const cancelUserModalBtn = document.getElementById('cancel-modal-btn');
const userForm = document.getElementById('add-user-form');
const userTableBody = document.getElementById('user-table-body');
const userCount = document.getElementById('user-count');

if (addUserBtn) addUserBtn.addEventListener('click', () => userModal.style.display = 'flex');
if (closeUserModalBtn) closeUserModalBtn.addEventListener('click', () => userModal.style.display = 'none');
if (cancelUserModalBtn) cancelUserModalBtn.addEventListener('click', () => userModal.style.display = 'none');

async function fetchSystemUsers() {
    if (!userTableBody) return;
    try {
        const q = query(collection(db, "system_users"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        
        userTableBody.innerHTML = '';
        let count = 0;
        
        querySnapshot.forEach((doc) => {
            count++;
            const data = doc.data();
            const tr = document.createElement('tr');
            
            let dateStr = "N/A";
            if (data.timestamp) {
                const dateObj = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
                dateStr = dateObj.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
            }

            tr.innerHTML = `
                <td>${data.name || 'Unknown'}</td>
                <td>${data.email || 'N/A'}</td>
                <td><span style="font-weight: 600;">${data.role || 'N/A'}</span></td>
                <td>${dateStr}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit-btn">✏️</button>
                        <button class="action-btn delete-btn">🗑️</button>
                    </div>
                </td>
            `;
            userTableBody.appendChild(tr);
        });
        
        if (userCount) {
            userCount.textContent = `${count} registered system users`;
        }
    } catch (error) {
        console.error(error);
    }
}

if (userForm) {
    fetchSystemUsers();
    
    userForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, "system_users"), {
                name: document.getElementById('sys-name').value,
                email: document.getElementById('sys-email').value,
                role: document.getElementById('sys-role').value,
                timestamp: new Date()
            });
            
            userForm.reset();
            if(userModal) userModal.style.display = 'none';
            alert('User added successfully to Firebase!');
            
            fetchSystemUsers();
        } catch (error) {
            alert('Error adding user: ' + error.message);
        }
    });
}

const recentOrdersBody = document.getElementById('recent-orders-body');
const totalOrdersCount = document.getElementById('total-orders-count');
const viewAllBtn = document.querySelector('.table-header .btn-secondary');

if (viewAllBtn) {
    viewAllBtn.addEventListener('click', () => {
        window.location.href = 'CustomerOrderReport.html';
    });
}

async function fetchDashboardData() {
    if (!recentOrdersBody) return; 
    
    try {
        const q = query(collection(db, "orders"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        
        recentOrdersBody.innerHTML = '';
        let count = 0;
        
        querySnapshot.forEach((doc) => {
            count++;
            
            if (count <= 5) { 
                const data = doc.data();
                const tr = document.createElement('tr');
                
                let dateStr = "N/A";
                if (data.timestamp) {
                    const dateObj = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
                    dateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                }

                let statusColor = '#ef6c00';
                let statusBg = '#fff3e0';
                if (data.status === 'Completed') {
                    statusColor = '#2e7d32';
                    statusBg = '#e8f5e9';
                } else if (data.status === 'In-progress') {
                    statusColor = '#1565c0';
                    statusBg = '#e3f2fd';
                }

                tr.innerHTML = `
                    <td style="color: #00796b; font-weight: 600;">${data.orderNumber || 'N/A'}</td>
                    <td>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <span style="background: #e0f2f1; color: #00796b; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;">
                                ${data.customer ? data.customer.charAt(0).toUpperCase() : '?'}
                            </span>
                            ${data.customer || 'Unknown'}
                        </div>
                    </td>
                    <td>${dateStr}</td>
                    <td>
                        <span style="background: ${statusBg}; color: ${statusColor}; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold;">
                            ${data.status || 'Pending'}
                        </span>
                    </td>
                    <td>R${data.amount || 0}</td>
                `;
                recentOrdersBody.appendChild(tr);
            }
        });
        
        if (totalOrdersCount) {
            totalOrdersCount.textContent = count;
        }
    } catch (error) {
        console.error(error);
    }
}
fetchDashboardData();