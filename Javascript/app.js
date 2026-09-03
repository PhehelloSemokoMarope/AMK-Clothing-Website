import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, doc, updateDoc, where, limit, deleteDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-auth.js";

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

function formatCleanFullName(rawName) {
    if (!rawName) return "Fashion Designer";
    let cleaned = rawName.replace(/[\._\-0-9]+/g, ' ');
    cleaned = cleaned.replace(/([a-z])([A-Z])/g, '$1 $2');
    return cleaned
        .trim()
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

function getSeparatedCustomerDisplay(data) {
    let fName = data.clientFirstName || '';
    let sName = data.clientSurname || '';
    if (!fName && data.customer) {
        const parts = data.customer.trim().split(' ');
        fName = parts[0] || 'Unknown';
        sName = parts.slice(1).join(' ') || '';
    }
    const cleanFirst = formatCleanFullName(fName);
    const cleanSurname = formatCleanFullName(sName);
    return cleanSurname ? `${cleanFirst} ${cleanSurname}` : cleanFirst;
}

function ensureUniversalHeader() {
    const headerRightContainers = document.querySelectorAll('.top-header .header-right');
    
    headerRightContainers.forEach(container => {
        if (!container.querySelector('.logout-btn')) {
            container.innerHTML = `
                <div class="profile-info">
                    <img src="../Images/user.png" alt="Profile" class="profile-icon">
                    <div class="profile-text">
                      <span class="profile-name" id="header-profile-name">Fashion Designer</span>
                      <span class="profile-role" id="header-profile-role">Administrator</span>
                    </div>
                </div>
                <button class="logout-btn">Logout</button>
            `;
        }
    });
}

onAuthStateChanged(auth, async (user) => {
    ensureUniversalHeader();
    const currentPage = window.location.pathname.toLowerCase();
    const isLoginPage = currentPage.includes('signin') || currentPage.includes('index') || currentPage.includes('login') || currentPage.includes('signup') || currentPage.endsWith('/');

    if (!user && !isLoginPage) {
        window.location.replace('SignIn.html'); 
    } 
    else if (user && isLoginPage && !currentPage.includes('index.html') && !currentPage.endsWith('/Websites/')) {
        window.location.replace('Homepage.html');
    }
    else if (user && !isLoginPage) {
        const nameElements = document.querySelectorAll('#header-profile-name, .profile-name');
        const roleElements = document.querySelectorAll('#header-profile-role, .profile-role');

        try {
            const userQuery = query(collection(db, "system_users"), where("email", "==", user.email));
            const userSnapshot = await getDocs(userQuery);
            
            if (userSnapshot.empty) {
                alert("Access Denied: This account is registered as a client, not a staff member.");
                await signOut(auth);
                window.location.replace('SignIn.html');
                return;
            }

            let displayName = "";
            let displayRole = "Staff";

            const userData = userSnapshot.docs[0].data();

            if (userData.status === 'Pending') {
                alert("Your account is pending administrator approval. Please wait until an admin approves your access.");
                await signOut(auth);
                window.location.replace('SignIn.html');
                return;
            }

            if (userData.status === 'Denied') {
                alert("Access Denied: Your account has been denied access by an administrator.");
                await signOut(auth);
                window.location.replace('SignIn.html');
                return;
            }

            displayName = userData.name ? formatCleanFullName(userData.name) : formatCleanFullName(user.email.split('@')[0]);
            displayRole = userData.role || "Staff";

            nameElements.forEach(el => el.textContent = displayName);
            roleElements.forEach(el => el.textContent = displayRole);

        } catch (err) {
            console.error("Error updating user header profile:", err);
            await signOut(auth);
            window.location.replace('SignIn.html');
        }
    }
});

document.addEventListener('click', (e) => {
    const logoutTarget = e.target.closest('.logout-btn');
    if (logoutTarget) {
        signOut(auth).then(() => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.replace('index.html');
        }).catch((error) => {
            alert("Error logging out: " + error.message);
        });
    }
});

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

const signupForm = document.getElementById('signup-form');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('signup-name').value.trim();
        const surnameInput = document.getElementById('signup-surname').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;
        const role = document.getElementById('signup-role') ? document.getElementById('signup-role').value : 'Staff';

        if (password !== confirmPassword) {
            alert("Passwords do not match! Please check and try again.");
            return;
        }

        const fullName = `${nameInput} ${surnameInput}`;

        try {
            await createUserWithEmailAndPassword(auth, email, password);

            await addDoc(collection(db, "system_users"), {
                name: formatCleanFullName(fullName),
                email: email,
                role: role,
                status: 'Pending',
                timestamp: new Date()
            });

            alert('Registration successful! You will only be able to sign in once an administrator has given you access.');
            window.location.replace('SignIn.html');
        } catch (error) {
            alert('Sign up failed: ' + error.message);
        }
    });
}

function updateHeaderDate() {
    const dateElements = document.querySelectorAll('.top-header p, .header-left p, #current-header-date');
    const today = new Date();
    const options = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    const formattedDate = today.toLocaleDateString('en-GB', options);

    dateElements.forEach(el => {
        if (el.textContent.includes('2026') || el.textContent.includes('2025') || el.textContent.includes(',')) {
            el.textContent = formattedDate;
        }
    });
}
updateHeaderDate();

async function loadCustomersIntoDropdowns() {
    const orderCustomerDropdown = document.getElementById('order-customer');
    const measCustomerDropdown = document.getElementById('meas-customer');
    const payCustomerDropdown = document.getElementById('pay-customer');
    const invCustomerDropdown = document.getElementById('inv-customer');
    
    if (!orderCustomerDropdown && !measCustomerDropdown && !payCustomerDropdown && !invCustomerDropdown) return;
    
    try {
        const q = query(collection(db, "customers"), orderBy("fullName", "asc"));
        const querySnapshot = await getDocs(q);
        
        const optionsHtml = '<option value="" disabled selected>Select a customer...</option>';
        let customerOptions = '';
        
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const cleanName = formatCleanFullName(data.fullName);
            customerOptions += `<option value="${cleanName}">${cleanName}</option>`;
        });
        
        if (orderCustomerDropdown) orderCustomerDropdown.innerHTML = optionsHtml + customerOptions;
        if (measCustomerDropdown) measCustomerDropdown.innerHTML = optionsHtml + customerOptions;
        if (payCustomerDropdown) payCustomerDropdown.innerHTML = optionsHtml + customerOptions;
        if (invCustomerDropdown) invCustomerDropdown.innerHTML = optionsHtml + customerOptions;
    } catch (error) {
        console.error(error);
    }
}
loadCustomersIntoDropdowns();

async function loadOrdersIntoDropdowns() {
    const updateOrderDropdown = document.getElementById('update-order-id');
    const payOrderDropdown = document.getElementById('pay-order-id');
    const invOrderDropdown = document.getElementById('inv-order-id');

    if (!updateOrderDropdown && !payOrderDropdown && !invOrderDropdown) return;

    try {
        const q = query(collection(db, "orders"), orderBy("orderNumber", "asc"));
        const querySnapshot = await getDocs(q);
        
        const optionsHtml = '<option value="" disabled selected>Select an order number...</option>';
        let orderOptions = '';

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.orderNumber) {
                orderOptions += `<option value="${data.orderNumber}">${data.orderNumber} (R${data.amount || 0})</option>`;
            }
        });

        if (updateOrderDropdown) updateOrderDropdown.innerHTML = optionsHtml + orderOptions;
        if (payOrderDropdown) payOrderDropdown.innerHTML = optionsHtml + orderOptions;
        if (invOrderDropdown) invOrderDropdown.innerHTML = optionsHtml + orderOptions;
    } catch (error) {
        console.error(error);
    }
}
loadOrdersIntoDropdowns();

async function setupOrderCreationMode() {
    const modeSelect = document.getElementById('order-mode-select');
    const onlineGroup = document.getElementById('online-selection-group');
    const scratchGroup = document.getElementById('scratch-customer-group');
    const orderItemInput = document.getElementById('order-item');
    const orderAmountInput = document.getElementById('order-amount');
    const orderRefSelect = document.getElementById('order-ref-select');
    const customerDropdown = document.getElementById('order-customer');

    if (!modeSelect) return;

    modeSelect.onchange = () => {
        if (modeSelect.value === 'online') {
            if (onlineGroup) onlineGroup.style.display = 'block';
            if (scratchGroup) scratchGroup.style.display = 'none';
            if (customerDropdown) customerDropdown.removeAttribute('required');
        } else {
            if (onlineGroup) onlineGroup.style.display = 'none';
            if (scratchGroup) scratchGroup.style.display = 'block';
            if (customerDropdown) customerDropdown.setAttribute('required', 'true');
            if (orderItemInput) orderItemInput.value = '';
            if (orderAmountInput) orderAmountInput.value = '';
        }
    };

    try {
        const q = query(collection(db, "orders"), orderBy("orderNumber", "asc"));
        const querySnapshot = await getDocs(q);
        
        let optionsHtml = '<option value="" disabled selected>Select an online order reference...</option>';

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.orderNumber) {
                const customerDisplay = getSeparatedCustomerDisplay(data);
                optionsHtml += `<option value="${docSnap.id}" data-customer="${customerDisplay}" data-desc="${data.description || ''}" data-amount="${data.amount || 0}">${data.orderNumber} - ${customerDisplay} (${data.status || 'Request'})</option>`;
            }
        });

        if (orderRefSelect) {
            orderRefSelect.innerHTML = optionsHtml;
            orderRefSelect.onchange = () => {
                const selectedOption = orderRefSelect.options[orderRefSelect.selectedIndex];
                const desc = selectedOption.getAttribute('data-desc');
                const amt = selectedOption.getAttribute('data-amount');

                if (orderItemInput) orderItemInput.value = desc;
                if (orderAmountInput) orderAmountInput.value = amt;
            };
        }
    } catch (error) {
        console.error("Error loading online orders:", error);
    }
}
setupOrderCreationMode();

async function loadInventoryIntoOrderDropdowns() {
    const fabricDropdown = document.getElementById('order-fabric');
    const threadDropdown = document.getElementById('order-thread');
    const accessoryDropdown = document.getElementById('order-accessory');

    if (!fabricDropdown && !threadDropdown && !accessoryDropdown) return;

    try {
        const q = query(collection(db, "inventory"), orderBy("timestamp", "asc"));
        const querySnapshot = await getDocs(q);
        
        let fabricHtml = '<option value="" disabled selected>Select fabric...</option>';
        let threadHtml = '<option value="None">None (No thread selected)</option>';
        let accessoryHtml = '<option value="None">None (No accessory selected)</option>';

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const category = (data.category || '').toLowerCase();
            const colorDesc = data.color ? ` (${data.color})` : '';
            const label = `${data.itemName}${colorDesc}`;

            if (category.includes('fabric')) {
                fabricHtml += `<option value="${label}">${label}</option>`;
            } else if (category.includes('thread')) {
                threadHtml += `<option value="${label}">${label}</option>`;
            } else if (category.includes('accessory') || category.includes('accessories')) {
                accessoryHtml += `<option value="${label}">${label}</option>`;
            }
        });

        if (fabricDropdown) fabricDropdown.innerHTML = fabricHtml;
        if (threadDropdown) threadDropdown.innerHTML = threadHtml;
        if (accessoryDropdown) accessoryDropdown.innerHTML = accessoryHtml;
    } catch (error) {
        console.error("Error loading inventory into order dropdowns:", error);
    }
}
loadInventoryIntoOrderDropdowns();

async function loadInventoryIntoDropdowns() {
    const stockItemDropdown = document.getElementById('stock-item');
    if (!stockItemDropdown) return;

    try {
        const q = query(collection(db, "inventory"), orderBy("timestamp", "asc"));
        const querySnapshot = await getDocs(q);
        
        const optionsHtml = '<option value="" disabled selected>Select an inventory item...</option>';
        let itemOptions = '';

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.itemName) {
                const colorInfo = data.color ? ` - Color: ${data.color}` : '';
                itemOptions += `<option value="${data.itemName}">${data.itemName} (${data.category || 'General'}${colorInfo})</option>`;
            }
        });

        stockItemDropdown.innerHTML = optionsHtml + itemOptions;
    } catch (error) {
        console.error(error);
    }
}
loadInventoryIntoDropdowns();

const createOrderForm = document.getElementById('create-order-form');
if (createOrderForm) {
    createOrderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const modeSelect = document.getElementById('order-mode-select');
        const mode = modeSelect ? modeSelect.value : 'scratch';
        
        const orderDate = document.getElementById('order-date').value;
        const amount = Number(document.getElementById('order-amount').value);
        const status = document.getElementById('order-status').value;
        const description = document.getElementById('order-item').value.trim();
        const fabricType = document.getElementById('order-fabric').value || 'Standard Fabric';

        try {
            if (mode === 'online') {
                const orderDocId = document.getElementById('order-ref-select').value;
                if (!orderDocId) {
                    alert('Please select an online order reference.');
                    return;
                }

                const orderRef = doc(db, "orders", orderDocId);
                await updateDoc(orderRef, {
                    orderDate: orderDate,
                    amount: amount,
                    status: status,
                    description: description,
                    fabricType: fabricType
                });
                
                alert('Online order request successfully reviewed and finalized!');
            } else {
                const customerSelect = document.getElementById('order-customer');
                const customerName = customerSelect ? customerSelect.value : '';
                
                if (!customerName) {
                    alert('Please select an existing customer.');
                    return;
                }

                const nameParts = customerName.split(' ');
                const firstName = nameParts[0] || '';
                const surname = nameParts.slice(1).join(' ') || '';

                const qAllOrders = query(collection(db, "orders"), orderBy("timestamp", "asc"));
                const allOrdersSnapshot = await getDocs(qAllOrders);
                
                let nextOrderInt = 1;
                if (!allOrdersSnapshot.empty) {
                    let maxNum = 0;
                    allOrdersSnapshot.forEach((docSnap) => {
                        const data = docSnap.data();
                        if (data.orderNumber) {
                            const numPart = parseInt(data.orderNumber.replace(/\D/g, ''), 10);
                            if (!isNaN(numPart) && numPart > maxNum) {
                                maxNum = numPart;
                            }
                        }
                    });
                    nextOrderInt = maxNum + 1;
                }
                
                const formattedNumber = nextOrderInt.toString().padStart(2, '0');
                const newOrderNumber = `Order #${formattedNumber}`;

                await addDoc(collection(db, "orders"), {
                    orderNumber: newOrderNumber,
                    customer: customerName,
                    clientFirstName: firstName,
                    clientSurname: surname,
                    orderDate: orderDate,
                    description: description,
                    fabricType: fabricType,
                    threadType: 'None',
                    accessoryType: 'None',
                    amount: amount,
                    status: status,
                    timestamp: new Date()
                });

                alert(`New order (${newOrderNumber}) created successfully from scratch!`);
            }
            
            createOrderForm.reset();
            setupOrderCreationMode();
        } catch (error) {
            alert('Error saving order: ' + error.message);
        }
    });
}

const invoiceTableBody = document.getElementById('invoice-table-body');
const invoiceCount = document.getElementById('invoice-count');
const invoiceSearchInput = document.getElementById('invoice-search-input');

async function fetchInvoicesTable() {
    if (!invoiceTableBody) return;
    try {
        const ordersSnapshot = await getDocs(query(collection(db, "orders"), orderBy("timestamp", "desc")));
        const paymentsSnapshot = await getDocs(collection(db, "payments"));

        const paymentsMap = {};
        paymentsSnapshot.forEach((payDoc) => {
            const payData = payDoc.data();
            const ordId = payData.orderId;
            paymentsMap[ordId] = (paymentsMap[ordId] || 0) + Number(payData.amount || 0);
        });

        invoiceTableBody.innerHTML = '';
        let count = 0;

        ordersSnapshot.forEach((docSnapshot) => {
            count++;
            const data = docSnapshot.data();
            const orderNum = data.orderNumber || 'N/A';
            const orderAmount = Number(data.amount || 0);
            const totalPaid = paymentsMap[orderNum] || 0;
            const customerDisplay = getSeparatedCustomerDisplay(data);

            let status = 'Unpaid';
            let statusColor = '#ef6c00';
            let statusBg = '#fff3e0';

            if (totalPaid >= orderAmount && orderAmount > 0) {
                status = 'Paid';
                statusColor = '#2e7d32';
                statusBg = '#e8f5e9';
            } else if (totalPaid > 0) {
                status = 'Partial';
                statusColor = '#1565c0';
                statusBg = '#e3f2fd';
            }

            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #eee';

            let dateStr = "N/A";
            if (data.timestamp) {
                const dateObj = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
                dateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            }

            tr.innerHTML = `
                <td style="padding: 12px; font-weight: 600; color: #00796b;" class="inv-id-cell">INV-${orderNum}</td>
                <td style="padding: 12px; font-weight: 500;" class="inv-cust-cell">${customerDisplay}</td>
                <td style="padding: 12px;">${orderNum}</td>
                <td style="padding: 12px; font-weight: bold;">R${orderAmount}</td>
                <td style="padding: 12px; color: #2e7d32; font-weight: bold;">R${totalPaid}</td>
                <td style="padding: 12px;">
                    <span style="background: ${statusBg}; color: ${statusColor}; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold;">
                        ${status}
                    </span>
                </td>
                <td style="padding: 12px;">
                    <button class="action-btn print-slip-btn" data-id="INV-${orderNum}" data-customer="${customerDisplay}" data-order="${orderNum}" data-date="${dateStr}" data-amount="${orderAmount}" data-paid="${totalPaid}" data-status="${status}" style="background: #e0f2f1; color: #00796b; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: bold;">Print Slip</button>
                </td>
            `;
            invoiceTableBody.appendChild(tr);
        });

        if (invoiceCount) {
            invoiceCount.textContent = `${count} order invoices tracked`;
        }

        const printButtons = invoiceTableBody.querySelectorAll('.print-slip-btn');
        printButtons.forEach(btn => {
            btn.onclick = () => {
                const invId = btn.getAttribute('data-id');
                const cust = btn.getAttribute('data-customer');
                const ord = btn.getAttribute('data-order');
                const dt = btn.getAttribute('data-date');
                const amt = btn.getAttribute('data-amount');
                const paid = btn.getAttribute('data-paid');
                const stat = btn.getAttribute('data-status');

                const printWindow = window.open('', '_blank', 'width=600,height=650');
                printWindow.document.write(`
                    <html>
                    <head>
                        <title>Payment Slip - ${invId}</title>
                        <style>
                            body { font-family: Arial, sans-serif; padding: 30px; color: #333; }
                            .header { text-align: center; border-bottom: 2px solid #00796b; padding-bottom: 15px; margin-bottom: 20px; }
                            .header h2 { margin: 0; color: #00796b; }
                            .details { margin-bottom: 25px; }
                            .details p { margin: 8px 0; font-size: 15px; }
                            .amount-box { background: #f4f6f6; padding: 15px; border-radius: 6px; margin-bottom: 25px; }
                            .amount-box p { margin: 5px 0; font-size: 16px; font-weight: bold; }
                            .footer { text-align: center; font-size: 12px; color: #777; border-top: 1px solid #ddd; padding-top: 15px; }
                        </style>
                    </head>
                    <body>
                        <div class="header">
                            <h2>AMK Clothing - Payment Slip</h2>
                            <p>Fashion Design Management System</p>
                        </div>
                        <div class="details">
                            <p><strong>Invoice ID:</strong> ${invId}</p>
                            <p><strong>Customer Name:</strong> ${cust}</p>
                            <p><strong>Order Reference:</strong> ${ord}</p>
                            <p><strong>Order Date:</strong> ${dt}</p>
                            <p><strong>Payment Status:</strong> ${stat}</p>
                        </div>
                        <div class="amount-box">
                            <p>Total Order Amount: R${amt}</p>
                            <p>Total Paid So Far: R${paid}</p>
                            <p>Balance Due: R${Math.max(0, Number(amt) - Number(paid))}</p>
                        </div>
                        <div class="footer">
                            <p>Thank you for your business with AMK Clothing!</p>
                        </div>
                    </body>
                    </html>
                `);
                printWindow.document.close();
                printWindow.focus();
                setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                }, 500);
            };
        });

    } catch (err) {
        console.error("Error loading invoices:", err);
    }
}
fetchInvoicesTable();

if (invoiceSearchInput && invoiceTableBody) {
    invoiceSearchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        const rows = invoiceTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const idCell = row.querySelector('.inv-id-cell');
            const custCell = row.querySelector('.inv-cust-cell');
            if (idCell && custCell) {
                const matchText = idCell.textContent.toLowerCase().includes(searchTerm) || custCell.textContent.toLowerCase().includes(searchTerm);
                row.style.display = matchText ? '' : 'none';
            }
        });
    });
}

const usersTableBody = document.getElementById('users-table-body');
const userCount = document.getElementById('user-count');
const userSearchInput = document.getElementById('user-search-input');

async function fetchSystemUsers() {
    if (!usersTableBody) return;
    try {
        let currentUserRole = "Staff";
        if (auth.currentUser) {
            const userQuery = query(collection(db, "system_users"), where("email", "==", auth.currentUser.email));
            const userSnap = await getDocs(userQuery);
            if (!userSnap.empty) {
                currentUserRole = userSnap.docs[0].data().role || "Staff";
            }
        }

        const canEdit = currentUserRole === 'Administrator' || currentUserRole === 'Designer';

        const q = query(collection(db, "system_users"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        
        usersTableBody.innerHTML = '';
        let count = 0;
        
        querySnapshot.forEach((docSnapshot) => {
            count++;
            const data = docSnapshot.data();
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #eee';

            let statusBg = '#fff3e0';
            let statusColor = '#ef6c00';
            if (data.status === 'Approved') {
                statusBg = '#e8f5e9';
                statusColor = '#2e7d32';
            } else if (data.status === 'Denied') {
                statusBg = '#ffebee';
                statusColor = '#d32f2f';
            }

            const roleOptions = `
                <option value="Staff" ${data.role === 'Staff' ? 'selected' : ''}>Staff</option>
                <option value="Designer" ${data.role === 'Designer' ? 'selected' : ''}>Designer</option>
                <option value="Administrator" ${data.role === 'Administrator' ? 'selected' : ''}>Administrator</option>
            `;

            const statusOptions = `
                <option value="Pending" ${data.status === 'Pending' ? 'selected' : ''}>Pending</option>
                <option value="Approved" ${data.status === 'Approved' ? 'selected' : ''}>Approved</option>
                <option value="Denied" ${data.status === 'Denied' ? 'selected' : ''}>Denied</option>
            `;

            tr.innerHTML = `
                <td style="padding: 12px; font-weight: 600; color: #00796b;" class="user-name-cell">${formatCleanFullName(data.name) || 'Unknown'}</td>
                <td style="padding: 12px;" class="user-email-cell">${data.email || 'N/A'}</td>
                <td style="padding: 12px;">
                    ${canEdit ? `<select class="role-select" data-id="${docSnapshot.id}" style="padding: 6px; border: 1px solid #ccc; border-radius: 6px;">${roleOptions}</select>` : (data.role || 'Staff')}
                </td>
                <td style="padding: 12px;">
                    ${canEdit ? `<select class="status-select" data-id="${docSnapshot.id}" style="padding: 6px; border: 1px solid #ccc; border-radius: 6px;">${statusOptions}</select>` : `<span style="background: ${statusBg}; color: ${statusColor}; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold;">${data.status || 'Pending'}</span>`}
                </td>
                <td style="padding: 12px;">
                    ${canEdit ? `<button class="action-btn save-user-btn" data-id="${docSnapshot.id}" style="background: #00796b; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: bold;">Save</button>` : '<span style="color: #777; font-size: 12px;">View Only</span>'}
                </td>
            `;
            usersTableBody.appendChild(tr);
        });

        if (userCount) {
            userCount.textContent = `${count} system users registered`;
        }

        if (canEdit) {
            const saveButtons = usersTableBody.querySelectorAll('.save-user-btn');
            saveButtons.forEach(btn => {
                btn.onclick = async () => {
                    const docId = btn.getAttribute('data-id');
                    const row = btn.closest('tr');
                    const newRole = row.querySelector('.role-select').value;
                    const newStatus = row.querySelector('.status-select').value;

                    try {
                        const userRef = doc(db, "system_users", docId);
                        await updateDoc(userRef, {
                            role: newRole,
                            status: newStatus
                        });
                        alert("User access and role updated successfully!");
                        fetchSystemUsers();
                    } catch (err) {
                        alert("Error updating user: " + err.message);
                    }
                };
            });
        }

    } catch (err) {
        console.error("Error fetching system users:", err);
    }
}
fetchSystemUsers();

if (userSearchInput && usersTableBody) {
    userSearchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        const rows = usersTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const nameCell = row.querySelector('.user-name-cell');
            const emailCell = row.querySelector('.user-email-cell');
            if (nameCell && emailCell) {
                const matchText = nameCell.textContent.toLowerCase().includes(searchTerm) || emailCell.textContent.toLowerCase().includes(searchTerm);
                row.style.display = matchText ? '' : 'none';
            }
        });
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
        const ordersSnapshot = await getDocs(collection(db, "orders"));
        const orderCounts = {};
        ordersSnapshot.forEach((doc) => {
            const custName = doc.data().customer;
            if (custName) {
                orderCounts[custName] = (orderCounts[custName] || 0) + 1;
            }
        });

        const q = query(collection(db, "customers"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        
        customerTableBody.innerHTML = '';
        let count = 0;
        
        querySnapshot.forEach((docSnapshot) => {
            count++;
            const data = docSnapshot.data();
            const tr = document.createElement('tr');
            const initials = data.fullName ? data.fullName.charAt(0).toUpperCase() : '?';
            const clientOrdersCount = orderCounts[data.fullName] || 0;
            const customerDisplay = formatCleanFullName(data.fullName);
            
            let dateStr = "N/A";
            if (data.timestamp) {
                const dateObj = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
                dateStr = dateObj.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' });
            }

            tr.innerHTML = `
                <td><span class="avatar-circle">${initials}</span> ${customerDisplay || 'Unknown'}</td>
                <td>${data.phone || 'N/A'}</td>
                <td>${data.email || 'N/A'}</td>
                <td style="color: #2b7a78; font-weight: bold;">${clientOrdersCount}</td>
                <td>${dateStr}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn edit-btn" data-id="${docSnapshot.id}">Edit</button>
                        <button class="action-btn delete-cust-btn" data-id="${docSnapshot.id}">Delete</button>
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

if (customerTableBody) {
    customerTableBody.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.edit-btn');
        const deleteBtn = e.target.closest('.delete-cust-btn');

        if (editBtn) {
            const docId = editBtn.getAttribute('data-id');
            try {
                const docRef = doc(db, "customers", docId);
                const docSnap = await getDoc(docRef);
                if (!docSnap.exists()) return;

                const custData = docSnap.data();
                const newName = prompt("Update Customer Name:", custData.fullName || "");
                if (newName === null) return;
                const newPhone = prompt("Update Phone Number:", custData.phone || "");
                if (newPhone === null) return;
                const newEmail = prompt("Update Email Address:", custData.email || "");
                if (newEmail === null) return;

                await updateDoc(docRef, {
                    fullName: formatCleanFullName(newName),
                    phone: newPhone.trim(),
                    email: newEmail.trim()
                });

                alert("Customer details updated successfully!");
                fetchCustomers();
                loadCustomersIntoDropdowns();
            } catch (err) {
                alert("Error updating customer: " + err.message);
            }
        }

        if (deleteBtn) {
            const docId = deleteBtn.getAttribute('data-id');
            if (confirm("Are you sure you want to delete this customer?")) {
                try {
                    await deleteDoc(doc(db, "customers", docId));
                    alert("Customer deleted successfully.");
                    fetchCustomers();
                    loadCustomersIntoDropdowns();
                } catch (err) {
                    alert("Error deleting customer: " + err.message);
                }
            }
        }
    });
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
                fullName: formatCleanFullName(name),
                phone: phone,
                email: email,
                timestamp: new Date()
            });
            
            customerForm.reset();
            if (customerModal) customerModal.style.display = 'none';
            alert('Customer saved successfully to Firebase!');
            
            fetchCustomers(); 
            loadCustomersIntoDropdowns();
        } catch (error) {
            alert('Error adding customer: ' + error.message);
        }
    });
}

const updateStatusForm = document.getElementById('update-status-form');
if (updateStatusForm) {
    updateStatusForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const orderNumInput = document.getElementById('update-order-id').value.trim();
        const newStatus = document.getElementById('update-order-status').value;

        if (!orderNumInput) {
            alert('Please select an order number.');
            return;
        }

        try {
            const q = query(collection(db, "orders"), where("orderNumber", "==", orderNumInput));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                alert(`Could not find ${orderNumInput}. Please check the selection and try again.`);
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
const measurementsTableBody = document.getElementById('measurements-table-body');

async function fetchMeasurementsTable() {
    if (!measurementsTableBody) return;
    try {
        const q = query(collection(db, "measurements"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        
        measurementsTableBody.innerHTML = '';
        
        querySnapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #eee';
            const customerDisplay = getSeparatedCustomerDisplay(data);
            
            tr.innerHTML = `
                <td style="padding: 12px; font-weight: 600; color: #00796b;">${customerDisplay || 'Unknown'}</td>
                <td style="padding: 12px;">${data.bust || 0}</td>
                <td style="padding: 12px;">${data.waist || 0}</td>
                <td style="padding: 12px;">${data.hips || 0}</td>
                <td style="padding: 12px;">${data.shoulder || 0}</td>
                <td style="padding: 12px;">${data.length || 0}</td>
                <td style="padding: 12px;">
                    <button class="action-btn delete-meas-btn" data-id="${docSnapshot.id}" style="background: #ffebee; color: #d32f2f; border: none; padding: 6px 10px; border-radius: 6px; cursor: pointer; font-weight: bold;">Delete</button>
                </td>
            `;
            measurementsTableBody.appendChild(tr);
        });
    } catch (error) {
        console.error(error);
    }
}

if (measurementsForm) {
    fetchMeasurementsTable();

    measurementsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            const fullNameClean = formatCleanFullName(document.getElementById('meas-customer').value);
            const nameParts = fullNameClean.split(' ');
            const firstName = nameParts[0] || '';
            const surname = nameParts.slice(1).join(' ') || '';

            await addDoc(collection(db, "measurements"), {
                customer: fullNameClean,
                clientFirstName: firstName,
                clientSurname: surname,
                bust: Number(document.getElementById('meas-bust').value),
                waist: Number(document.getElementById('meas-waist').value),
                hips: Number(document.getElementById('meas-hips').value),
                shoulder: Number(document.getElementById('meas-shoulder').value),
                length: Number(document.getElementById('meas-length').value),
                timestamp: new Date()
            });
            measurementsForm.reset();
            alert('Measurements successfully saved to Firebase!');
            fetchMeasurementsTable();
        } catch (error) {
            alert('Error saving measurements: ' + error.message);
        }
    });
}

const measurementsContainer = document.getElementById('measurements-table-body');
if (measurementsContainer) {
    measurementsContainer.addEventListener('click', async (e) => {
        const btn = e.target.closest('.delete-meas-btn');
        if (!btn) return;

        const docId = btn.getAttribute('data-id');
        if (confirm("Are you sure you want to delete these client measurements?")) {
            try {
                await deleteDoc(doc(db, "measurements", docId));
                alert("Measurements deleted successfully.");
                fetchMeasurementsTable();
            } catch (err) {
                alert("Error deleting measurements: " + err.message);
            }
        }
    });
}

const paymentForm = document.getElementById('process-payment-form');
const paymentsTableBody = document.getElementById('payments-table-body');

async function fetchPaymentsTable() {
    if (!paymentsTableBody) return;
    try {
        const q = query(collection(db, "payments"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        
        paymentsTableBody.innerHTML = '';
        
        querySnapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #eee';
            const customerDisplay = getSeparatedCustomerDisplay(data);
            
            let dateStr = "N/A";
            if (data.timestamp) {
                const dateObj = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
                dateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            }

            tr.innerHTML = `
                <td style="padding: 12px; font-weight: 600; color: #00796b;" class="payment-order-id">${data.orderId || 'N/A'}</td>
                <td style="padding: 12px;">${customerDisplay || 'Unknown'}</td>
                <td style="padding: 12px;">R${data.amount || 0}</td>
                <td style="padding: 12px;">${data.method || 'N/A'}</td>
                <td style="padding: 12px;">${dateStr}</td>
            `;
            paymentsTableBody.appendChild(tr);
        });
    } catch (error) {
        console.error(error);
    }
}

const paymentSearchInput = document.getElementById('payment-search-input');
if (paymentSearchInput) {
    paymentSearchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        const rows = paymentsTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const orderIdCell = row.querySelector('.payment-order-id');
            if (orderIdCell) {
                const orderText = orderIdCell.textContent.toLowerCase();
                if (orderText.includes(searchTerm)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            }
        });
    });
}

if (paymentForm) {
    fetchPaymentsTable();

    paymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const orderId = document.getElementById('pay-order-id').value;
        const customer = document.getElementById('pay-customer').value;
        const paymentAmount = Number(document.getElementById('pay-amount').value);
        const method = document.getElementById('pay-method').value;

        try {
            const orderQuery = query(collection(db, "orders"), where("orderNumber", "==", orderId));
            const orderSnapshot = await getDocs(orderQuery);

            if (orderSnapshot.empty) {
                alert("Selected order could not be found.");
                return;
            }

            const orderData = orderSnapshot.docs[0].data();
            const totalOrderAmount = Number(orderData.amount || 0);

            const payQuery = query(collection(db, "payments"), where("orderId", "==", orderId));
            const paySnapshot = await getDocs(payQuery);

            let totalPaidSoFar = 0;
            paySnapshot.forEach((payDoc) => {
                totalPaidSoFar += Number(payDoc.data().amount || 0);
            });

            const newTotalPaid = totalPaidSoFar + paymentAmount;

            if (newTotalPaid > totalOrderAmount) {
                const excess = newTotalPaid - totalOrderAmount;
                const remainingAllowed = totalOrderAmount - totalPaidSoFar;
                alert(`Overpayment Alert!\n\nThis order (${orderId}) has a total balance of R${totalOrderAmount}.\nAlready paid: R${totalPaidSoFar}.\nMaximum remaining balance is R${remainingAllowed}.\n\nYou are trying to overpay by R${excess}! Please adjust the amount.`);
                return;
            }

            const fullNameClean = formatCleanFullName(customer);
            const nameParts = fullNameClean.split(' ');
            const firstName = nameParts[0] || '';
            const surname = nameParts.slice(1).join(' ') || '';

            await addDoc(collection(db, "payments"), {
                orderId: orderId,
                customer: fullNameClean,
                clientFirstName: firstName,
                clientSurname: surname,
                amount: paymentAmount,
                method: method,
                timestamp: new Date()
            });

            paymentForm.reset();
            alert('Payment successfully recorded and deducted from order balance!');
            fetchPaymentsTable();
        } catch (error) {
            alert('Error processing payment: ' + error.message);
        }
    });
}

const payOrderDropdown = document.getElementById('pay-order-id');
const payCustomerDropdown = document.getElementById('pay-customer');

if (payOrderDropdown && payCustomerDropdown) {
    payOrderDropdown.addEventListener('change', async (e) => {
        const selectedOrderNumber = e.target.value;
        if (!selectedOrderNumber) return;

        try {
            const q = query(collection(db, "orders"), where("orderNumber", "==", selectedOrderNumber));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const orderData = querySnapshot.docs[0].data();
                if (orderData.customer) {
                    payCustomerDropdown.value = getSeparatedCustomerDisplay(orderData);
                }
            }
        } catch (error) {
            console.error(error);
        }
    });
}

const pendingPopTableBody = document.getElementById('pending-pop-table-body');

async function fetchPendingPOPs() {
    if (!pendingPopTableBody) return;
    try {
        const q = query(collection(db, "pending_payments"), where("status", "==", "Pending Verification"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);

        pendingPopTableBody.innerHTML = '';

        if (querySnapshot.empty) {
            pendingPopTableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: #777;">No pending proof of payments to review.</td></tr>`;
            return;
        }

        querySnapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #eee';

            const customerDisplay = getSeparatedCustomerDisplay(data);

            tr.innerHTML = `
                <td style="padding: 12px; font-weight: 600; color: #00796b;">${data.orderId}</td>
                <td style="padding: 12px;">${customerDisplay}</td>
                <td style="padding: 12px; font-weight: bold;">R${data.amount}</td>
                <td style="padding: 12px;">
                    <a href="${data.fileData}" download="${data.fileName || 'ProofOfPayment'}" style="color: #00796b; font-weight: bold; text-decoration: underline;" target="_blank">Download File</a>
                </td>
                <td style="padding: 12px;">
                    <button class="action-btn approve-pop-btn" data-id="${docSnapshot.id}" data-order="${data.orderId}" data-customer="${customerDisplay}" data-amount="${data.amount}" style="background: #2e7d32; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: bold; margin-right: 5px;">Approve</button>
                    <button class="action-btn delete-pop-btn" data-id="${docSnapshot.id}" style="background: #ffebee; color: #d32f2f; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: bold;">Delete</button>
                </td>
            `;
            pendingPopTableBody.appendChild(tr);
        });

        const approveButtons = pendingPopTableBody.querySelectorAll('.approve-pop-btn');
        approveButtons.forEach(btn => {
            btn.onclick = async () => {
                const docId = btn.getAttribute('data-id');
                const orderId = btn.getAttribute('data-order');
                const customer = btn.getAttribute('data-customer');
                const amount = Number(btn.getAttribute('data-amount'));

                const fullNameClean = formatCleanFullName(customer);
                const nameParts = fullNameClean.split(' ');
                const firstName = nameParts[0] || '';
                const surname = nameParts.slice(1).join(' ') || '';

                try {
                    await addDoc(collection(db, "payments"), {
                        orderId: orderId,
                        customer: fullNameClean,
                        clientFirstName: firstName,
                        clientSurname: surname,
                        amount: amount,
                        method: 'Bank Transfer / POP',
                        timestamp: new Date()
                    });

                    const popRef = doc(db, "pending_payments", docId);
                    await updateDoc(popRef, { status: 'Approved' });

                    alert("Payment approved and successfully recorded to order balance!");
                    fetchPendingPOPs();
                    if (typeof fetchPaymentsTable === 'function') fetchPaymentsTable();
                    if (typeof fetchInvoicesTable === 'function') fetchInvoicesTable();
                } catch (err) {
                    alert("Error approving payment: " + err.message);
                }
            };
        });

        const deletePopButtons = pendingPopTableBody.querySelectorAll('.delete-pop-btn');
        deletePopButtons.forEach(btn => {
            btn.onclick = async () => {
                const docId = btn.getAttribute('data-id');

                if (confirm("Are you sure you want to delete this pending proof of payment?")) {
                    try {
                        await deleteDoc(doc(db, "pending_payments", docId));
                        alert("Proof of payment deleted successfully.");
                        fetchPendingPOPs();
                    } catch (err) {
                        alert("Error deleting record: " + err.message);
                    }
                }
            };
        });

    } catch (err) {
        console.error("Error loading pending POPs:", err);
    }
}
fetchPendingPOPs();

const addItemForm = document.getElementById('add-item-form');
const inventoryTableBody = document.getElementById('inventory-table-body');
const inventoryCount = document.getElementById('inventory-count');

async function fetchInventoryTable() {
    if (!inventoryTableBody) return;
    try {
        const q = query(collection(db, "inventory"), orderBy("timestamp", "asc"));
        const querySnapshot = await getDocs(q);
        
        inventoryTableBody.innerHTML = '';
        let count = 0;
        
        querySnapshot.forEach((docSnapshot) => {
            count++;
            const data = docSnapshot.data();
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #eee';

            const itemColor = data.color ? ` (Color: ${data.color})` : '';
            const sequentialId = `Item #${count.toString().padStart(2, '0')}`;

            tr.innerHTML = `
                <td style="padding: 12px; font-weight: 600; color: #00796b;">${sequentialId}</td>
                <td style="padding: 12px;" class="inv-name-cell">${data.itemName || 'N/A'}${itemColor}</td>
                <td style="padding: 12px;">${data.category || 'N/A'}</td>
                <td style="padding: 12px;">${data.supplier || 'N/A'}</td>
                <td style="padding: 12px;">${data.quantity || 0}</td>
                <td style="padding: 12px;">${data.unit || 'Units'}</td>
                <td style="padding: 12px;">R${data.cost || 0}</td>
                <td style="padding: 12px;">
                    <button class="action-btn delete-inv-btn" data-id="${docSnapshot.id}" style="background: #ffebee; color: #d32f2f; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: bold;">Delete</button>
                </td>
            `;
            inventoryTableBody.appendChild(tr);
        });

        if (inventoryCount) {
            inventoryCount.textContent = `${count} registered inventory items`;
        }
    } catch (error) {
        console.error(error);
    }
}

if (addItemForm) {
    fetchInventoryTable();

    addItemForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, "inventory"), {
                itemName: document.getElementById('inv-item-name').value,
                category: document.getElementById('inv-item-category').value,
                supplier: document.getElementById('inv-item-supplier').value,
                color: document.getElementById('inv-item-color') ? document.getElementById('inv-item-color').value : '',
                quantity: Number(document.getElementById('inv-item-qty').value),
                unit: document.getElementById('inv-item-unit').value,
                reorderLevel: Number(document.getElementById('inv-item-reorder').value),
                cost: Number(document.getElementById('inv-item-cost').value),
                timestamp: new Date()
            });
            addItemForm.reset();
            alert('Item successfully added to Inventory!');
            fetchInventoryTable();
            loadInventoryIntoDropdowns();
            loadInventoryIntoOrderDropdowns();
        } catch (error) {
            alert('Error adding item: ' + error.message);
        }
    });
}

const inventoryContainer = document.getElementById('inventory-table-body');
if (inventoryContainer) {
    inventoryContainer.addEventListener('click', async (e) => {
        const btn = e.target.closest('.delete-inv-btn');
        if (!btn) return;

        const docId = btn.getAttribute('data-id');
        if (confirm("Are you sure you want to delete this inventory item?")) {
            try {
                await deleteDoc(doc(db, "inventory", docId));
                alert("Inventory item deleted successfully.");
                fetchInventoryTable();
                loadInventoryIntoDropdowns();
                loadInventoryIntoOrderDropdowns();
            } catch (err) {
                alert("Error deleting item: " + err.message);
            }
        }
    });
}

const inventorySearchInput = document.getElementById('inventory-search-input');
if (inventorySearchInput && inventoryTableBody) {
    inventorySearchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        const rows = inventoryTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const nameCell = row.querySelector('.inv-name-cell');
            if (nameCell) {
                const textMatch = nameCell.textContent.toLowerCase().includes(searchTerm);
                row.style.display = textMatch ? '' : 'none';
            }
        });
    });
}

const stockForm = document.getElementById('update-stock-form');
if (stockForm) {
    stockForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const itemName = document.getElementById('stock-item').value;
        const actionType = document.getElementById('stock-action').value;
        const updateQty = Number(document.getElementById('stock-quantity').value);

        if (!itemName) {
            alert('Please select an inventory item.');
            return;
        }

        try {
            const invQuery = query(collection(db, "inventory"), where("itemName", "==", itemName));
            const invSnapshot = await getDocs(invQuery);

            if (invSnapshot.empty) {
                alert('Could not find the selected item in inventory.');
                return;
            }

            const itemDocSnap = invSnapshot.docs[0];
            const itemRef = doc(db, "inventory", itemDocSnap.id);
            const currentData = itemDocSnap.data();
            const currentQty = Number(currentData.quantity || 0);

            let newQty = currentQty;
            const actionLower = actionType.toLowerCase();

            if (actionLower.includes('reduce') || actionLower.includes('remove') || actionLower.includes('minus') || actionLower.includes('use') || actionLower.includes('decrease') || actionLower.includes('deduct')) {
                newQty = Math.max(0, currentQty - updateQty);
            } else {
                newQty = currentQty + updateQty;
            }

            await updateDoc(itemRef, {
                quantity: newQty
            });

            await addDoc(collection(db, "stock_updates"), {
                itemId: itemName,
                action: actionType,
                quantity: updateQty,
                timestamp: new Date()
            });
            
            stockForm.reset();
            alert(`Stock successfully updated! New quantity for ${itemName}: ${newQty}`);
            
            if (typeof fetchInventoryTable === 'function') fetchInventoryTable();
            if (typeof fetchLowStockAlerts === 'function') fetchLowStockAlerts();
            if (typeof fetchInventoryReport === 'function') fetchInventoryReport();

        } catch (error) {
            alert('Error updating stock: ' + error.message);
        }
    });
}

const alertTableBody = document.getElementById('alert-table-body');
const alertCount = document.getElementById('alert-count');
const searchInput = document.getElementById('search-input');

async function fetchLowStockAlerts() {
    if (!alertTableBody) return;
    try {
        const q = query(collection(db, "inventory"), orderBy("itemName", "asc"));
        const querySnapshot = await getDocs(q);
        
        alertTableBody.innerHTML = '';
        let count = 0;
        
        querySnapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            const currentStock = Number(data.quantity || 0);
            const reorderThreshold = Number(data.reorderLevel || 0);

            if (currentStock <= reorderThreshold) {
                count++;
                const tr = document.createElement('tr');
                const itemColor = data.color ? ` (Color: ${data.color})` : '';
                tr.innerHTML = `
                    <td style="padding: 12px; font-weight: 600; color: #d32f2f;" class="alert-name-cell">${data.itemName || 'N/A'}${itemColor}</td>
                    <td style="padding: 12px;">${data.category || 'N/A'}</td>
                    <td style="padding: 12px;">${data.supplier || 'N/A'}</td>
                    <td style="padding: 12px; font-weight: bold; color: #d32f2f;">${currentStock} ${data.unit || 'Units'}</td>
                    <td style="padding: 12px;">${reorderThreshold}</td>
                    <td style="padding: 12px;">
                        <span style="background: #ffebee; color: #d32f2f; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold;">Restock Required</span>
                    </td>
                `;
                alertTableBody.appendChild(tr);
            }
        });

        if (alertCount) {
            alertCount.textContent = `${count} low stock items requiring attention`;
        }
    } catch (error) {
        console.error(error);
    }
}
fetchLowStockAlerts();

if (searchInput && alertTableBody) {
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        const rows = alertTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const nameCell = row.querySelector('.alert-name-cell');
            if (nameCell) {
                const textMatch = nameCell.textContent.toLowerCase().includes(searchTerm);
                row.style.display = textMatch ? '' : 'none';
            }
        });
    });
}

const salesTableBody = document.getElementById('sales-table-body');
const totalRevenueMetric = document.getElementById('total-revenue-metric');
const totalOutfitsMetric = document.getElementById('total-outfits-metric');
const salesCountElement = document.getElementById('sales-count');
const salesSearchInput = document.getElementById('sales-search-input');

async function fetchSalesReport() {
    if (!salesTableBody) return;
    try {
        const ordersSnapshot = await getDocs(query(collection(db, "orders"), orderBy("timestamp", "desc")));
        const paymentsSnapshot = await getDocs(collection(db, "payments"));

        const paymentsMap = {};
        paymentsSnapshot.forEach((payDoc) => {
            const payData = payDoc.data();
            const ordId = payData.orderId;
            paymentsMap[ordId] = (paymentsMap[ordId] || 0) + Number(payData.amount || 0);
        });

        salesTableBody.innerHTML = '';
        let totalRevenue = 0;
        let outfitCount = 0;

        ordersSnapshot.forEach((docSnapshot) => {
            const data = docSnapshot.data();
            const orderNum = data.orderNumber || 'N/A';
            const orderAmount = Number(data.amount || 0);
            const totalPaid = paymentsMap[orderNum] || 0;
            const customerDisplay = getSeparatedCustomerDisplay(data);

            if (orderAmount > 0 && totalPaid >= orderAmount) {
                outfitCount++;
                totalRevenue += orderAmount;

                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid #eee';

                let dateStr = "N/A";
                if (data.timestamp) {
                    const dateObj = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
                    dateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                }

                tr.innerHTML = `
                    <td style="padding: 12px; font-weight: 600; color: #00796b;" class="sales-order-id">${orderNum}</td>
                    <td style="padding: 12px;" class="sales-cust-name">${customerDisplay}</td>
                    <td style="padding: 12px; font-weight: 500;" class="sales-outfit-name">${data.description || 'Custom Outfit'}</td>
                    <td style="padding: 12px; font-weight: bold; color: #2e7d32;">R${orderAmount}</td>
                    <td style="padding: 12px;">
                        <span style="background: #e8f5e9; color: #2e7d32; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold;">Fully Paid</span>
                    </td>
                    <td style="padding: 12px;">${dateStr}</td>
                `;
                salesTableBody.appendChild(tr);
            }
        });

        if (totalRevenueMetric) totalRevenueMetric.textContent = `R${totalRevenue}`;
        if (totalOutfitsMetric) totalOutfitsMetric.textContent = outfitCount;
        if (salesCountElement) salesCountElement.textContent = `${outfitCount} fully paid outfits recorded`;

    } catch (error) {
        console.error("Error loading sales report:", error);
    }
}
fetchSalesReport();

if (salesSearchInput && salesTableBody) {
    salesSearchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        const rows = salesTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const orderIdCell = row.querySelector('.sales-order-id');
            const custCell = row.querySelector('.sales-cust-name');
            const outfitCell = row.querySelector('.sales-outfit-name');
            if (orderIdCell && custCell && outfitCell) {
                const matchText = orderIdCell.textContent.toLowerCase().includes(searchTerm) || 
                                  custCell.textContent.toLowerCase().includes(searchTerm) || 
                                  outfitCell.textContent.toLowerCase().includes(searchTerm);
                row.style.display = matchText ? '' : 'none';
            }
        });
    });
}

const inventoryReportTableBody = document.getElementById('inventory-report-table-body');
const inventoryReportCount = document.getElementById('inventory-report-count');
const inventoryReportSearch = document.getElementById('inventory-report-search');

const editModal = document.getElementById('edit-inventory-modal');
const editForm = document.getElementById('edit-inventory-form');
const cancelEditBtn = document.getElementById('cancel-edit-modal');

if (cancelEditBtn) {
    cancelEditBtn.addEventListener('click', () => {
        if (editModal) editModal.style.display = 'none';
    });
}

async function fetchInventoryReport() {
    if (!inventoryReportTableBody) return;
    try {
        const q = query(collection(db, "inventory"), orderBy("timestamp", "asc"));
        const querySnapshot = await getDocs(q);
        
        inventoryReportTableBody.innerHTML = '';
        let count = 0;
        
        querySnapshot.forEach((docSnapshot) => {
            count++;
            const data = docSnapshot.data();
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #eee';

            const qty = Number(data.quantity || 0);
            const reorder = Number(data.reorderLevel || 0);
            const isLowStock = qty <= reorder;
            const itemColor = data.color ? ` (Color: ${data.color})` : '';
            const sequentialId = `Item #${count.toString().padStart(2, '0')}`;

            let statusHtml = `<span style="background: #e8f5e9; color: #2e7d32; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold;">In Stock</span>`;
            if (isLowStock) {
                statusHtml = `<span style="background: #ffebee; color: #d32f2f; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold;">Low Stock</span>`;
            }

            tr.innerHTML = `
                <td style="padding: 12px; font-weight: 600; color: #00796b;" class="inv-rep-id">${sequentialId}</td>
                <td style="padding: 12px; font-weight: 500;" class="inv-rep-name">${data.itemName || 'N/A'}${itemColor}</td>
                <td style="padding: 12px;">${data.category || 'N/A'}</td>
                <td style="padding: 12px;">${data.supplier || 'N/A'}</td>
                <td style="padding: 12px; font-weight: bold;">${qty} ${data.unit || 'Units'}</td>
                <td style="padding: 12px;">${reorder}</td>
                <td style="padding: 12px;">${statusHtml}</td>
                <td style="padding: 12px;">
                    <button class="action-btn edit-inv-modal-btn" data-id="${docSnapshot.id}" data-name="${data.itemName || ''}" data-category="${data.category || ''}" data-supplier="${data.supplier || ''}" data-color="${data.color || ''}" data-qty="${qty}" data-reorder="${reorder}" style="background: #e0f2f1; color: #00796b; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: bold;">Edit</button>
                </td>
            `;
            inventoryReportTableBody.appendChild(tr);
        });

        if (inventoryReportCount) {
            inventoryReportCount.textContent = `${count} inventory items tracked`;
        }

        const editButtons = inventoryReportTableBody.querySelectorAll('.edit-inv-modal-btn');
        editButtons.forEach(btn => {
            btn.onclick = () => {
                document.getElementById('edit-inv-id').value = btn.getAttribute('data-id');
                document.getElementById('edit-inv-name').value = btn.getAttribute('data-name');
                document.getElementById('edit-inv-category').value = btn.getAttribute('data-category');
                document.getElementById('edit-inv-supplier').value = btn.getAttribute('data-supplier');
                if (document.getElementById('edit-inv-color')) {
                    document.getElementById('edit-inv-color').value = btn.getAttribute('data-color');
                }
                document.getElementById('edit-inv-qty').value = btn.getAttribute('data-qty');
                document.getElementById('edit-inv-reorder').value = btn.getAttribute('data-reorder');

                if (editModal) editModal.style.display = 'flex';
            };
        });

    } catch (error) {
        console.error("Error loading inventory report:", error);
    }
}
fetchInventoryReport();

if (editForm) {
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const docId = document.getElementById('edit-inv-id').value;
        const updatedName = document.getElementById('edit-inv-name').value;
        const updatedCategory = document.getElementById('edit-inv-category').value;
        const updatedSupplier = document.getElementById('edit-inv-supplier').value;
        const updatedColor = document.getElementById('edit-inv-color') ? document.getElementById('edit-inv-color').value : '';
        const updatedQty = Number(document.getElementById('edit-inv-qty').value);
        const updatedReorder = Number(document.getElementById('edit-inv-reorder').value);

        try {
            const itemRef = doc(db, "inventory", docId);
            await updateDoc(itemRef, {
                itemName: updatedName,
                category: updatedCategory,
                supplier: updatedSupplier,
                color: updatedColor,
                quantity: updatedQty,
                reorderLevel: updatedReorder
            });

            if (editModal) editModal.style.display = 'none';
            alert("Inventory item updated successfully!");
            fetchInventoryReport();
            loadInventoryIntoOrderDropdowns();
        } catch (err) {
            alert("Error updating item: " + err.message);
        }
    });
}

if (inventoryReportSearch && inventoryReportTableBody) {
    inventoryReportSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        const rows = inventoryReportTableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const nameCell = row.querySelector('.inv-rep-name');
            const idCell = row.querySelector('.inv-rep-id');
            if (nameCell && idCell) {
                const textMatch = nameCell.textContent.toLowerCase().includes(searchTerm) || idCell.textContent.toLowerCase().includes(searchTerm);
                row.style.display = textMatch ? '' : 'none';
            }
        });
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
    try {
        const customersSnapshot = await getDocs(collection(db, "customers"));
        const activeCustomersMetric = document.getElementById('active-customers-count') || document.getElementById('total-customers-metric');
        if (activeCustomersMetric) {
            activeCustomersMetric.textContent = customersSnapshot.size;
        }

        const inventorySnapshot = await getDocs(collection(db, "inventory"));
        let lowStockCount = 0;
        inventorySnapshot.forEach(docSnap => {
            const d = docSnap.data();
            const qty = Number(d.quantity || 0);
            const reorder = Number(d.reorderLevel || 0);
            if (qty <= reorder) {
                lowStockCount++;
            }
        });
        const lowStockMetric = document.getElementById('low-stock-count') || document.getElementById('low-stock-metric');
        if (lowStockMetric) {
            lowStockMetric.textContent = lowStockCount;
        }

        const ordersQuery = query(collection(db, "orders"), orderBy("timestamp", "desc"));
        const ordersSnapshot = await getDocs(ordersQuery);
        const paymentsSnapshot = await getDocs(collection(db, "payments"));
        
        const paymentsMap = {};
        paymentsSnapshot.forEach((payDoc) => {
            const payData = payDoc.data();
            const ordId = payData.orderId;
            paymentsMap[ordId] = (paymentsMap[ordId] || 0) + Number(payData.amount || 0);
        });

        if (recentOrdersBody) {
            recentOrdersBody.innerHTML = '';
        }

        let count = 0;
        let totalOutstandingBalance = 0;
        
        ordersSnapshot.forEach((docSnap) => {
            count++;
            const data = docSnap.data();
            const orderNum = data.orderNumber || 'N/A';
            const orderAmount = Number(data.amount || 0);
            const paidSoFar = paymentsMap[orderNum] || 0;
            const balanceDue = Math.max(0, orderAmount - paidSoFar);
            const customerDisplay = getSeparatedCustomerDisplay(data);

            if (balanceDue > 0) {
                totalOutstandingBalance += balanceDue;
            }
            
            if (recentOrdersBody && count <= 10) { 
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid #eee';
                
                let dateStr = "N/A";
                if (data.timestamp) {
                    const dateObj = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
                    dateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                }

                let statusColor = '#ef6c00';
                let statusBg = '#fff3e0';
                if (balanceDue === 0) {
                    statusColor = '#2e7d32';
                    statusBg = '#e8f5e9';
                } else if (data.status === 'In-progress') {
                    statusColor = '#1565c0';
                    statusBg = '#e3f2fd';
                }

                tr.innerHTML = `
                    <td style="padding: 12px; color: #00796b; font-weight: 600;">${orderNum}</td>
                    <td style="padding: 12px;">${customerDisplay}</td>
                    <td style="padding: 12px;">${dateStr}</td>
                    <td style="padding: 12px;">
                        <span style="background: ${statusBg}; color: ${statusColor}; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold;">
                            ${balanceDue === 0 ? 'Fully Paid' : (paidSoFar > 0 ? 'Partial' : 'Unpaid')}
                        </span>
                    </td>
                    <td style="padding: 12px; font-weight: bold;">R${orderAmount} <span style="font-size: 12px; color: #d32f2f; font-weight: normal;">(Due: R${balanceDue})</span></td>
                `;
                recentOrdersBody.appendChild(tr);
            }
        });
        
        if (totalOrdersCount) {
            totalOrdersCount.textContent = count;
        }

        const pendingPaymentsElement = document.getElementById('pending-payments-amount') || document.getElementById('pending-revenue') || document.getElementById('pending-payments');
        if (pendingPaymentsElement) {
            pendingPaymentsElement.textContent = `R${totalOutstandingBalance}`;
        }

    } catch (error) {
        console.error("Error loading dashboard metrics:", error);
    }
}
fetchDashboardData();

const customerOrderReportBody = document.getElementById('customer-order-report-body');
const customerOrderCount = document.getElementById('customer-order-count');
const customerOrderSearch = document.getElementById('customer-order-search');

async function fetchCustomerOrderReport() {
    if (!customerOrderReportBody) return;

    try {
        const ordersQuery = query(collection(db, "orders"), orderBy("timestamp", "desc"));
        const ordersSnapshot = await getDocs(ordersQuery);
        
        const measurementsSnapshot = await getDocs(collection(db, "measurements"));
        const measurementsMap = {};
        
        measurementsSnapshot.forEach((docSnap) => {
            const mData = docSnap.data();
            if (mData.customer) {
                const custKey = mData.customer.trim().toLowerCase();
                measurementsMap[custKey] = `B: ${mData.bust || 0} | W: ${mData.waist || 0} | H: ${mData.hips || 0} | Sh: ${mData.shoulder || 0} | L: ${mData.length || 0}`;
            }
        });

        customerOrderReportBody.innerHTML = '';
        let count = 0;
        
        ordersSnapshot.forEach((docSnapshot) => {
            count++;
            const data = docSnapshot.data();
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid #eee';
            
            let dateStr = "N/A";
            if (data.timestamp) {
                const dateObj = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
                dateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            }

            let statusColor = '#ef6c00';
            let statusBg = '#fff3e0';
            if (data.status === 'Completed' || data.status === 'Fully Paid') {
                statusColor = '#2e7d32';
                statusBg = '#e8f5e9';
            } else if (data.status === 'In-progress') {
                statusColor = '#1565c0';
                statusBg = '#e3f2fd';
            } else if (data.status === 'Online Request') {
                statusColor = '#7b1fa2';
                statusBg = '#f3e5f5';
            }

            const customerDisplay = getSeparatedCustomerDisplay(data);
            const custKeyClean = (data.customer || '').trim().toLowerCase();
            const clientMeasurements = measurementsMap[custKeyClean] || '<span style="color: #d32f2f; font-style: italic;">No measurements recorded</span>';

            let designImgHtml = '<span style="color: #777; font-style: italic;">None</span>';
            if (data.designImage) {
                designImgHtml = `<a href="${data.designImage}" target="_blank" style="color: #00796b; font-weight: bold; text-decoration: underline;">View Photo</a>`;
            }

            tr.innerHTML = `
                <td style="padding: 12px; font-weight: 600; color: #00796b;" class="ord-id-cell">${data.orderNumber || 'N/A'}</td>
                <td style="padding: 12px;" class="ord-cust-cell">${customerDisplay}</td>
                <td style="padding: 12px;">${dateStr}</td>
                <td style="padding: 12px;" class="ord-garment-cell">${data.description || 'N/A'}<br><small style="color: #555; font-weight: bold;">Design Photo: ${designImgHtml}</small></td>
                <td style="padding: 12px; font-size: 13px; color: #444;">${clientMeasurements}</td>
                <td style="padding: 12px;">
                    <span style="background: ${statusBg}; color: ${statusColor}; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold;">
                        ${data.status || 'Pending'}
                    </span>
                </td>
                <td style="padding: 12px;">
                    <button class="action-btn delete-order-btn" data-id="${docSnapshot.id}" style="background: #ffebee; color: #d32f2f; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: bold;">Delete</button>
                </td>
            `;
            customerOrderReportBody.appendChild(tr);
        });

        if (customerOrderCount) {
            customerOrderCount.textContent = `${count} customer order records`;
        }

        const deleteButtons = customerOrderReportBody.querySelectorAll('.delete-order-btn');
        deleteButtons.forEach(button => {
            button.onclick = async (e) => {
                e.preventDefault();
                const docId = button.getAttribute('data-id');
                
                if (confirm("Are you sure you want to delete this order? This action cannot be undone.")) {
                    try {
                        await deleteDoc(doc(db, "orders", docId));
                        alert("Order successfully removed.");
                        fetchCustomerOrderReport();
                    } catch (err) {
                        alert("Error deleting order: " + err.message);
                    }
                }
            };
        });

    } catch (error) {
        console.error("Error loading customer orders report:", error);
    }
}
fetchCustomerOrderReport();

if (customerOrderSearch && customerOrderReportBody) {
    customerOrderSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        const rows = customerOrderReportBody.querySelectorAll('tr');
        rows.forEach(row => {
            const idCell = row.querySelector('.ord-id-cell');
            const custCell = row.querySelector('.ord-cust-cell');
            const garmentCell = row.querySelector('.ord-garment-cell');
            if (idCell && custCell && garmentCell) {
                const matchText = idCell.textContent.toLowerCase().includes(searchTerm) || 
                                  custCell.textContent.toLowerCase().includes(searchTerm) || 
                                  garmentCell.textContent.toLowerCase().includes(searchTerm);
                row.style.display = matchText ? '' : 'none';
            }
        });
    });
}

let selectedClientEmail = null;

async function loadAdminChatHub() {
    const clientListEl = document.getElementById('admin-client-list');
    const chatMessagesEl = document.getElementById('admin-chat-messages');
    const chatFormEl = document.getElementById('admin-chat-form');
    const chatTitleEl = document.getElementById('active-chat-title');

    if (!clientListEl) return;

    try {
        const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
        const snapshot = await getDocs(q);

        const clientsMap = {};
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const email = data.clientEmail || data.userEmail;
            if (email) {
                if (!clientsMap[email]) clientsMap[email] = [];
                clientsMap[email].push(data);
            }
        });

        clientListEl.innerHTML = '';
        const clientEmails = Object.keys(clientsMap);

        if (clientEmails.length === 0) {
            clientListEl.innerHTML = `<p style="color: #777; font-size: 13px;">No client messages found.</p>`;
            return;
        }

        clientEmails.forEach((email) => {
            const btn = document.createElement('div');
            btn.style.cssText = `padding: 12px; border-radius: 8px; background: ${selectedClientEmail === email ? '#e0f2f1' : '#f9f9f9'}; cursor: pointer; border: 1px solid #ddd; font-size: 13px; font-weight: bold; color: #333;`;
            btn.textContent = email;
            
            btn.onclick = () => {
                selectedClientEmail = email;
                if (chatTitleEl) chatTitleEl.textContent = `Chat with ${email}`;
                if (chatFormEl) chatFormEl.style.display = 'flex';
                renderAdminMessages(clientsMap[email]);
                loadAdminChatHub();
            };

            clientListEl.appendChild(btn);
        });

    } catch (err) {
        console.error("Error loading admin chat list:", err);
    }
}

function renderAdminMessages(messages) {
    const chatMessagesEl = document.getElementById('admin-chat-messages');
    if (!chatMessagesEl) return;

    chatMessagesEl.innerHTML = '';
    messages.forEach((msg) => {
        const isClient = msg.sender === 'client';
        const bubble = document.createElement('div');
        bubble.style.cssText = `max-width: 70%; padding: 10px 15px; border-radius: 10px; font-size: 14px; align-self: ${isClient ? 'flex-start' : 'flex-end'}; background: ${isClient ? '#e0f2f1' : '#2b7a78'}; color: ${isClient ? '#333' : 'white'};`;
        bubble.innerHTML = `<strong>${isClient ? 'Client' : 'Designer (You)'}:</strong><br>${msg.text}`;
        chatMessagesEl.appendChild(bubble);
    });
    chatMessagesEl.scrollTop = chatMessagesEl.scrollHeight;
}

const adminChatForm = document.getElementById('admin-chat-form');
if (adminChatForm) {
    adminChatForm.onsubmit = async (e) => {
        e.preventDefault();
        const input = document.getElementById('admin-chat-input');
        const text = input.value.trim();
        if (!text || !selectedClientEmail) return;

        try {
            await addDoc(collection(db, "messages"), {
                userEmail: selectedClientEmail,
                clientEmail: selectedClientEmail,
                sender: 'admin',
                text: text,
                timestamp: new Date()
            });

            input.value = '';
            
            const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
            const snapshot = await getDocs(q);
            const clientMessages = [];
            snapshot.forEach((docSnap) => {
                const data = docSnap.data();
                if ((data.clientEmail || data.userEmail) === selectedClientEmail) {
                    clientMessages.push(data);
                }
            });
            renderAdminMessages(clientMessages);
        } catch (err) {
            alert("Failed to send reply: " + err.message);
        }
    };
}

window.addEventListener('load', loadAdminChatHub);

const splashScreen = document.getElementById('splash-screen');
if (splashScreen) {
    function hideSplash() {
        splashScreen.classList.add('slide-up');
    }

    splashScreen.addEventListener('click', hideSplash);

    let touchStartY = 0;
    
    splashScreen.addEventListener('touchstart', function(e) {
        touchStartY = e.touches[0].clientY;
    });

    splashScreen.addEventListener('touchmove', function(e) {
        let touchEndY = e.touches[0].clientY;
        if (touchStartY - touchEndY > 50) {
            hideSplash();
        }
    });
}
function setWebsiteFavicon() {
    let existingLink = document.querySelector("link[rel~='icon']");
    if (!existingLink) {
        let link = document.createElement('link');
        link.rel = 'icon';
        link.type = 'image/png';
        link.href = '../Images/logo.png'; 
        document.head.appendChild(link);
    }
}
window.addEventListener('load', setWebsiteFavicon);