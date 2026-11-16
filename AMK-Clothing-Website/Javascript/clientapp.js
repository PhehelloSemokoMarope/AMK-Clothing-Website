import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, doc, updateDoc, where, deleteDoc } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
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
    if (!rawName) return "Client";
    let cleaned = rawName.replace(/[\._\-0-9]+/g, ' ').trim();
    cleaned = cleaned.replace(/([a-z])([A-Z])/g, '$1 $2');
    cleaned = cleaned.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
    return cleaned
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join(' ');
}

onAuthStateChanged(auth, async (user) => {
    const authContainer = document.getElementById('auth-header-container');
    if (authContainer) {
        if (user) {
            const cachedName = sessionStorage.getItem(`userName_${user.email}`);
            
            const renderAuthHeader = (name) => {
                authContainer.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.1); padding: 6px 14px; border-radius: 25px;">
                        <i class="far fa-user" style="color: #d96c06;"></i>
                        <span style="color: #1c2841; font-weight: 700; font-size: 0.9rem;">Hi, ${name}</span>
                        <button id="global-logout-btn" style="background-color: #fcd34d !important; color: #1c2841 !important; border: none; padding: 4px 10px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 0.8rem;" title="Sign Out">Logout</button>
                    </div>
                `;
                
                const logoutBtn = document.getElementById('global-logout-btn');
                if (logoutBtn) {
                    logoutBtn.onclick = async () => {
                        sessionStorage.clear();
                        await signOut(auth);
                        window.location.reload();
                    };
                }
            };

            if (cachedName) {
                renderAuthHeader(cachedName);
            }

            try {
                const clientQuery = query(collection(db, "clients"), where("email", "==", user.email));
                const clientSnap = await getDocs(clientQuery);
                let firstName = "Client";

                if (!clientSnap.empty) {
                    const data = clientSnap.docs[0].data();
                    firstName = data.firstName || data.fullName?.split(' ')[0] || user.email.split('@')[0];
                } else {
                    firstName = user.email.split('@')[0];
                }
                
                const formattedName = formatCleanFullName(firstName);
                sessionStorage.setItem(`userName_${user.email}`, formattedName);
                
                if (!cachedName || cachedName !== formattedName) {
                    renderAuthHeader(formattedName);
                }
            } catch (err) {
                console.error(err);
            }
        } else {
            authContainer.innerHTML = `
                <a href="ClientSignIn.html" class="sign-in-btn" id="nav-signin-btn">
                    <i class="far fa-user"></i> Sign In
                </a>
            `;
        }
    }

    updateHeaderBadges(user);
});

async function updateHeaderBadges(user) {
    const cartCountEl = document.getElementById('cart-item-count');
    const wishlistCountEl = document.getElementById('wishlist-item-count');

    if (user) {
        const cachedCartCount = sessionStorage.getItem(`cartCount_${user.email}`);
        const cachedWishCount = sessionStorage.getItem(`wishCount_${user.email}`);
        
        if (cachedCartCount && cartCountEl) cartCountEl.textContent = cachedCartCount;
        if (cachedWishCount && wishlistCountEl) wishlistCountEl.textContent = cachedWishCount;

        try {
            const cartQuery = query(collection(db, "cart"), where("userEmail", "==", user.email));
            const cartSnap = await getDocs(cartQuery);
            const actualCartCount = cartSnap.size;
            
            if (cartCountEl) cartCountEl.textContent = actualCartCount;
            sessionStorage.setItem(`cartCount_${user.email}`, actualCartCount);

            const wishQuery = query(collection(db, "wishlist"), where("userEmail", "==", user.email));
            const wishSnap = await getDocs(wishQuery);
            const actualWishCount = wishSnap.size;
            
            if (wishlistCountEl) wishlistCountEl.textContent = actualWishCount;
            sessionStorage.setItem(`wishCount_${user.email}`, actualWishCount);
        } catch (err) {
            console.error(err);
        }
    } else {
        if (cartCountEl) cartCountEl.textContent = '0';
        if (wishlistCountEl) wishlistCountEl.textContent = '0';
    }
}

const clientSignupForm = document.getElementById('client-signup-form');
if (clientSignupForm) {
    clientSignupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('client-name').value.trim();
        const surnameInput = document.getElementById('client-surname').value.trim();
        const phone = document.getElementById('client-phone').value.trim();
        const email = document.getElementById('client-email').value.trim();
        const password = document.getElementById('client-password').value;
        const confirmPassword = document.getElementById('client-confirm-password').value;

        if (password !== confirmPassword) {
            alert("Passwords do not match! Please check and try again.");
            return;
        }

        const fullName = `${nameInput} ${surnameInput}`;
        const cleanName = formatCleanFullName(fullName);

        try {
            await createUserWithEmailAndPassword(auth, email, password);

            await addDoc(collection(db, "clients"), {
                firstName: formatCleanFullName(nameInput),
                surname: formatCleanFullName(surnameInput),
                fullName: cleanName,
                phone: phone,
                email: email,
                timestamp: new Date()
            });

            await addDoc(collection(db, "customers"), {
                fullName: cleanName,
                phone: phone,
                email: email,
                timestamp: new Date()
            });

            alert('Registration successful! Welcome to AMK Clothing.');
            window.location.replace('index.html');
        } catch (error) {
            alert('Registration failed: ' + error.message);
        }
    });
}

const clientLoginForm = document.getElementById('client-login-form');
if (clientLoginForm) {
    clientLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('client-email').value.trim();
        const password = document.getElementById('client-password').value;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            window.location.replace('index.html');
        } catch (error) {
            alert("Sign in failed: " + error.message);
        }
    });
}

document.addEventListener('click', (e) => {
    const logoutTarget = e.target.closest('.logout-btn');
    if (logoutTarget) {
        e.preventDefault();
        sessionStorage.clear();
        signOut(auth).then(() => {
            localStorage.clear();
            window.location.replace('../index.html');
        }).catch((error) => {
            alert("Error logging out: " + error.message);
        });
    }
});

const clientPortalForm = document.getElementById('client-portal-form');
if (clientPortalForm) {
    const scheduleCheckbox = document.getElementById('cp-schedule-fitting');
    const manualSection = document.getElementById('manual-measurements-section');
    
    if (scheduleCheckbox && manualSection) {
        scheduleCheckbox.addEventListener('change', () => {
            if (scheduleCheckbox.checked) {
                manualSection.style.display = 'none';
            } else {
                manualSection.style.display = 'block';
            }
        });
    }

    clientPortalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) {
            alert("Please sign in to submit an order request.");
            window.location.replace('ClientSignIn.html');
            return;
        }

        const imageInput = document.getElementById('cp-design-image');
        if (!imageInput || imageInput.files.length === 0) {
            alert("Please upload a reference design photo for your custom clothing request.");
            return;
        }

        const requiresFitting = scheduleCheckbox ? scheduleCheckbox.checked : false;
        
        let bust = 0, waist = 0, hips = 0, shoulder = 0, length = 0;
        let measurementNotes = "Manual input by client.";

        if (requiresFitting) {
            measurementNotes = "Client requested in-person measurement fitting via chat.";
        } else {
            bust = document.getElementById('cp-bust').value;
            waist = document.getElementById('cp-waist').value;
            hips = document.getElementById('cp-hips').value;
            shoulder = document.getElementById('cp-shoulder').value;
            length = document.getElementById('cp-length').value;

            if (!bust || !waist || !hips || !shoulder || !length) {
                alert("Please provide all body measurements, or check the box to schedule an in-person fitting.");
                return;
            }
        }

        const fullNameClean = formatCleanFullName(document.getElementById('cp-name').value.trim());
        const nameParts = fullNameClean.split(' ');
        const firstName = nameParts[0] || '';
        const surname = nameParts.slice(1).join(' ') || '';

        const garment = document.getElementById('cp-garment').value.trim();
        const fabric = document.getElementById('cp-fabric').value.trim() || 'Custom / Client Provided';
        const notes = document.getElementById('cp-notes').value.trim();

        const file = imageInput.files[0];
        const reader = new FileReader();

        reader.onload = async function(uploadEvent) {
            const base64DesignImage = uploadEvent.target.result;

            try {
                await addDoc(collection(db, "measurements"), {
                    customer: fullNameClean,
                    clientFirstName: firstName,
                    clientSurname: surname,
                    inPersonFittingRequired: requiresFitting,
                    bust: Number(bust),
                    waist: Number(waist),
                    hips: Number(hips),
                    shoulder: Number(shoulder),
                    length: Number(length),
                    notes: measurementNotes,
                    timestamp: new Date()
                });

                const qAllOrders = query(collection(db, "orders"), orderBy("timestamp", "asc"));
                const allOrdersSnapshot = await getDocs(qAllOrders);
                
                let nextOrderInt = 1;
                if (!allOrdersSnapshot.empty) {
                    let maxNum = 0;
                    allOrdersSnapshot.forEach((doc) => {
                        const data = doc.data();
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

                const finalDescription = requiresFitting 
                    ? `Custom Clothing: ${garment} [IN-PERSON FITTING REQUIRED] (Notes: ${notes})` 
                    : `Custom Clothing: ${garment} (Notes: ${notes})`;

                await addDoc(collection(db, "orders"), {
                    orderNumber: newOrderNumber,
                    customer: fullNameClean,
                    clientFirstName: firstName,
                    clientSurname: surname,
                    email: user.email,
                    orderDate: new Date().toISOString().split('T')[0],
                    description: finalDescription,
                    fabricType: fabric,
                    designImage: base64DesignImage,
                    designImageName: file.name,
                    threadType: 'None',
                    accessoryType: 'None',
                    amount: 0,
                    status: 'Online Request',
                    timestamp: new Date()
                });

                clientPortalForm.reset();
                if (manualSection) manualSection.style.display = 'block';
                
                if (requiresFitting) {
                    alert(`Success! Your custom order request (${newOrderNumber}) has been submitted. Please send us a message in the chat to schedule your fitting!`);
                } else {
                    alert(`Success! Your custom order request (${newOrderNumber}) has been submitted.`);
                }
                
            } catch (error) {
                alert('Error submitting request: ' + error.message);
            }
        };

        reader.readAsDataURL(file);
    });
}

const popModal = document.getElementById('pop-modal');
const popForm = document.getElementById('pop-form');
const cancelPopBtn = document.getElementById('cancel-pop-btn');

if (cancelPopBtn) {
    cancelPopBtn.addEventListener('click', () => {
        if (popModal) popModal.style.display = 'none';
    });
}

if (popForm) {
    popForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const orderRef = document.getElementById('pop-order-ref').value;
        const customerName = formatCleanFullName(document.getElementById('pop-customer-name').value);
        const nameParts = customerName.split(' ');
        const firstName = nameParts[0] || '';
        const surname = nameParts.slice(1).join(' ') || '';

        const amount = Number(document.getElementById('pop-amount').value);
        const fileInput = document.getElementById('pop-file');

        if (fileInput.files.length === 0) {
            alert("Please select a file to upload.");
            return;
        }

        const file = fileInput.files[0];
        const reader = new FileReader();

        reader.onload = async function(uploadEvent) {
            const base64FileString = uploadEvent.target.result;

            try {
                await addDoc(collection(db, "pending_payments"), {
                    orderId: orderRef,
                    customer: customerName,
                    clientFirstName: firstName,
                    clientSurname: surname,
                    amount: amount,
                    fileData: base64FileString,
                    fileName: file.name,
                    status: 'Pending Verification',
                    timestamp: new Date()
                });

                if (popModal) popModal.style.display = 'none';
                popForm.reset();
                alert("Proof of payment submitted successfully!");
            } catch (err) {
                alert("Error uploading proof of payment: " + err.message);
            }
        };

        reader.readAsDataURL(file);
    });
}

const clientOrdersTableBody = document.getElementById('client-orders-table-body');
const chatMessagesContainer = document.getElementById('chat-messages-container');

onAuthStateChanged(auth, async (user) => {
    const currentPage = window.location.pathname.toLowerCase();
    const isClientAuthPage = currentPage.includes('clientsignin') || currentPage.includes('clientsignup');

    if (!user && !isClientAuthPage && currentPage.includes('clientportal')) {
        window.location.replace('ClientSignIn.html');
        return;
    }

    if (user) {
        try {
            const clientQuery = query(collection(db, "clients"), where("email", "==", user.email));
            const clientSnap = await getDocs(clientQuery);

            let clientName = formatCleanFullName(user.email.split('@')[0]);
            let clientPhone = '';
            let clientEmail = user.email;
            let clientAddress = '';

            if (!clientSnap.empty) {
                const clientData = clientSnap.docs[0].data();
                
                if (clientData.firstName && clientData.surname) {
                    clientName = formatCleanFullName(`${clientData.firstName} ${clientData.surname}`);
                } else if (clientData.fullName) {
                    clientName = formatCleanFullName(clientData.fullName);
                }

                clientPhone = clientData.phone || clientData.phoneNumber || clientData.tel || '';
                clientEmail = clientData.email || user.email;
                clientAddress = clientData.deliveryAddress || '';
            }
            
            const clientNameEl = document.getElementById('header-client-name');
            const clientRoleEl = document.getElementById('header-client-role');
            if (clientNameEl) clientNameEl.textContent = clientName;
            if (clientRoleEl) clientRoleEl.textContent = user.email;

            const welcomeSub = document.getElementById('client-welcome-sub');
            if (welcomeSub) {
                welcomeSub.textContent = `Welcome back, ${clientName}. Here are your active orders and payment slips.`;
            }

            if (document.getElementById('cp-name')) document.getElementById('cp-name').value = clientName;
            if (document.getElementById('cp-phone')) document.getElementById('cp-phone').value = clientPhone;
            if (document.getElementById('cp-email')) document.getElementById('cp-email').value = clientEmail;

            if (document.getElementById('checkout-customer-name')) document.getElementById('checkout-customer-name').value = clientName;
            if (document.getElementById('checkout-customer-email')) document.getElementById('checkout-customer-email').value = clientEmail;
            if (document.getElementById('checkout-customer-phone')) document.getElementById('checkout-customer-phone').value = clientPhone;
            if (document.getElementById('checkout-delivery-address') && clientAddress) {
                document.getElementById('checkout-delivery-address').value = clientAddress;
            }

            if (clientOrdersTableBody) {
                const ordersQuery = query(collection(db, "orders"), orderBy("timestamp", "desc"));
                const ordersSnapshot = await getDocs(ordersQuery);
                const paymentsSnapshot = await getDocs(collection(db, "payments"));

                const paymentsMap = {};
                paymentsSnapshot.forEach((payDoc) => {
                    const payData = payDoc.data();
                    const ordId = payData.orderId;
                    if (ordId) {
                        paymentsMap[ordId] = (paymentsMap[ordId] || 0) + Number(payData.amount || 0);
                    }
                });

                clientOrdersTableBody.innerHTML = '';
                let foundOrdersCount = 0;

                ordersSnapshot.forEach((docSnapshot) => {
                    const data = docSnapshot.data();
                    
                    const matchesEmail = data.email && data.email.toLowerCase() === user.email.toLowerCase();
                    const matchesName = data.customer && data.customer.trim().toLowerCase() === clientName.trim().toLowerCase();

                    if (matchesEmail || matchesName) {
                        foundOrdersCount++;
                        const orderNum = data.orderNumber || 'N/A';
                        const orderAmount = Number(data.amount || 0);
                        const paidSoFar = paymentsMap[orderNum] || 0;
                        const balanceDue = Math.max(0, orderAmount - paidSoFar);

                        let status = data.status || 'Processing';
                        let statusColor = '#ef6c00';
                        let statusBg = '#fff3e0';

                        if (paidSoFar >= orderAmount && orderAmount > 0) {
                            status = 'Fully Paid';
                            statusColor = '#2e7d32';
                            statusBg = '#e8f5e9';
                        } else if (paidSoFar > 0) {
                            status = 'Partial Payment';
                            statusColor = '#1565c0';
                            statusBg = '#e3f2fd';
                        } else {
                            status = 'Pending Payment / POP Required';
                            statusColor = '#d32f2f';
                            statusBg = '#ffebee';
                        }

                        let dateStr = "N/A";
                        if (data.timestamp) {
                            const dateObj = data.timestamp.toDate ? data.timestamp.toDate() : new Date(data.timestamp);
                            dateStr = dateObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                        }

                        const tr = document.createElement('tr');
                        tr.innerHTML = `
                            <td style="font-weight: 600; color: #00796b;">${orderNum}</td>
                            <td>${data.description || 'Custom Outfit'}</td>
                            <td>${dateStr}</td>
                            <td style="font-weight: bold;">R${orderAmount}</td>
                            <td style="color: #d32f2f; font-weight: bold;">R${balanceDue}</td>
                            <td>
                                <span style="background: ${statusBg}; color: ${statusColor}; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: bold;">
                                    ${status}
                                </span>
                            </td>
                            <td>
                                <button class="action-btn client-print-slip" data-id="INV-${orderNum}" data-customer="${clientName}" data-order="${orderNum}" data-date="${dateStr}" data-amount="${orderAmount}" data-paid="${paidSoFar}" data-status="${status}" data-address="${data.deliveryAddress || 'N/A'}" data-phone="${data.phone || clientPhone || 'N/A'}" style="margin-right: 5px;">Print Slip</button>
                                <button class="action-btn upload-pop-btn" data-order="${orderNum}" data-customer="${clientName}" style="background: #00796b; color: white;">Upload POP</button>
                            </td>
                        `;
                        clientOrdersTableBody.appendChild(tr);
                    }
                });

                if (foundOrdersCount === 0) {
                    clientOrdersTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #777;">No orders found for your account.</td></tr>`;
                }

                const printButtons = clientOrdersTableBody.querySelectorAll('.client-print-slip');
                printButtons.forEach(btn => {
                    btn.onclick = () => {
                        const invId = btn.getAttribute('data-id');
                        const cust = btn.getAttribute('data-customer');
                        const ord = btn.getAttribute('data-order');
                        const dt = btn.getAttribute('data-date');
                        const amt = btn.getAttribute('data-amount');
                        const paid = btn.getAttribute('data-paid');
                        const stat = btn.getAttribute('data-status');
                        const addr = btn.getAttribute('data-address');
                        const phn = btn.getAttribute('data-phone');

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
                                    <p><strong>Phone Number:</strong> ${phn}</p>
                                    <p><strong>Delivery Address:</strong> ${addr}</p>
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
                                    <p>Thank you for choosing AMK Clothing!</p>
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

                const uploadPopButtons = clientOrdersTableBody.querySelectorAll('.upload-pop-btn');
                uploadPopButtons.forEach(btn => {
                    btn.onclick = () => {
                        document.getElementById('pop-order-ref').value = btn.getAttribute('data-order');
                        document.getElementById('pop-customer-name').value = formatCleanFullName(btn.getAttribute('data-customer'));
                        if (popModal) popModal.style.display = 'flex';
                    };
                });
            }

            if (chatMessagesContainer) {
                const loadMessages = async () => {
                    try {
                        const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
                        const querySnapshot = await getDocs(q);

                        chatMessagesContainer.innerHTML = '';
                        let count = 0;

                        querySnapshot.forEach((docSnap) => {
                            const msg = docSnap.data();
                            if (msg.userEmail === user.email || msg.clientEmail === user.email) {
                                count++;
                                const isClient = msg.sender === 'client';
                                const bubble = document.createElement('div');
                                bubble.style.cssText = `max-width: 75%; padding: 12px 18px; border-radius: 12px; font-size: 0.95rem; line-height: 1.4; align-self: ${isClient ? 'flex-end' : 'flex-start'}; background: ${isClient ? '#2b7a78' : '#ffffff'}; color: ${isClient ? 'white' : '#1c2841'}; box-shadow: 0 2px 8px rgba(0,0,0,0.06); border: ${isClient ? 'none' : '1px solid #eaeaea'}; border-bottom-${isClient ? 'right' : 'left'}-radius: 2px;`;
                                bubble.innerHTML = `<strong style="font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.8; display: block; margin-bottom: 4px;">${isClient ? 'You' : 'Tailor Team'}</strong>${msg.text}`;
                                chatMessagesContainer.appendChild(bubble);
                            }
                        });

                        if (count === 0) {
                            chatMessagesContainer.innerHTML = `<p style="color: #777; text-align: center;">No messages yet. Start a conversation with our tailor team below!</p>`;
                        }
                        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
                    } catch (err) {
                        console.error(err);
                    }
                };

                loadMessages();

                const chatSendForm = document.getElementById('chat-send-form');
                if (chatSendForm && !chatSendForm.hasAttribute('data-bound')) {
                    chatSendForm.setAttribute('data-bound', 'true');
                    chatSendForm.onsubmit = async (e) => {
                        e.preventDefault();
                        const textInput = document.getElementById('chat-input-text');
                        const text = textInput.value.trim();
                        if (!text) return;

                        try {
                            await addDoc(collection(db, "messages"), {
                                userEmail: user.email,
                                clientEmail: user.email,
                                sender: 'client',
                                text: text,
                                timestamp: new Date()
                            });

                            textInput.value = '';
                            loadMessages();
                        } catch (err) {
                            alert(err.message);
                        }
                    };
                }
            }

        } catch (err) {
            console.error(err);
        }
    }
});

const globeIcon = document.querySelector('.globe-icon');
const dropdownContent = document.querySelector('.nav-dropdown-content');

if (globeIcon && dropdownContent) {
    globeIcon.addEventListener('click', (e) => {
        e.preventDefault();
        dropdownContent.classList.toggle('active');
    });

    document.addEventListener('click', (e) => {
        if (!globeIcon.contains(e.target) && !dropdownContent.contains(e.target)) {
            dropdownContent.classList.remove('active');
        }
    });

    document.querySelectorAll('.lang-btn, .curr-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            dropdownContent.classList.remove('active');
        });
    });
}

let zarToUsdRate = null;

async function fetchExchangeRate() {
    try {
        const response = await fetch('https://v6.exchangerate-api.com/v6/e687f8d115003022f0c29761/latest/ZAR');
        const data = await response.json();
        if (data.result === 'success') {
            zarToUsdRate = data.conversion_rates.USD;
        }
    } catch (error) {
        console.error(error);
    }
}

fetchExchangeRate();

const GOOGLE_TRANSLATE_API_KEY = "AIzaSyB5ULNCucbL_Ocojy0gvxu0_iCo8lyXa58"; 

document.querySelectorAll('.lang-btn').forEach(button => {
    button.addEventListener('click', async function(e) {
        e.preventDefault();
        const targetLang = this.getAttribute('data-lang'); 
        
        const elementsToTranslate = document.querySelectorAll('[data-translate]');
        if (elementsToTranslate.length === 0) return;

        elementsToTranslate.forEach(el => {
            if (!el.hasAttribute('data-original-text')) {
                el.setAttribute('data-original-text', el.innerHTML);
            }
        });

        if (targetLang === 'en') {
            elementsToTranslate.forEach(el => {
                el.innerHTML = el.getAttribute('data-original-text');
            });
            return;
        }

        if (!GOOGLE_TRANSLATE_API_KEY) return;

        const textsToTranslate = Array.from(elementsToTranslate).map(el => el.getAttribute('data-original-text'));

        try {
            const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${GOOGLE_TRANSLATE_API_KEY}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    q: textsToTranslate,
                    target: targetLang,
                    format: 'html',
                    source: 'en'
                })
            });

            const data = await response.json();
            
            if (data.data && data.data.translations) {
                const translations = data.data.translations;
                elementsToTranslate.forEach((el, index) => {
                    el.innerHTML = translations[index].translatedText;
                });
            }
        } catch (error) {
            console.error(error);
        }
    });
});

document.querySelectorAll('.curr-btn').forEach(button => {
    button.addEventListener('click', function(e) {
        e.preventDefault();
        const selectedCurr = this.getAttribute('data-curr');
        
        document.querySelectorAll('.dynamic-price').forEach(priceElement => {
            const zarPriceStr = priceElement.getAttribute('data-price-zar');
            if (!zarPriceStr) return;
            
            const zarPrice = parseFloat(zarPriceStr);

            if (selectedCurr === 'zar') {
                priceElement.textContent = `R ${zarPrice.toFixed(2)}`;
            } else if (selectedCurr === 'usd') {
                if (zarToUsdRate !== null) {
                    const usdPrice = (zarPrice * zarToUsdRate).toFixed(2);
                    priceElement.textContent = `$ ${usdPrice}`;
                } else {
                    const staticUsd = priceElement.getAttribute('data-price-usd');
                    priceElement.textContent = `$ ${staticUsd}`;
                }
            }
        });
    });
});

// --- EVENT DELEGATION FOR DYNAMIC BUTTONS ---
document.addEventListener('change', (e) => {
    if (e.target.classList.contains('enable-alteration-checkbox')) {
        const card = e.target.closest('.product-card');
        const textarea = card.querySelector('.alteration-notes-input');
        if (textarea) {
            textarea.style.display = e.target.checked ? 'block' : 'none';
        }
    }
});

document.addEventListener('click', async (e) => {
    const cartBtn = e.target.closest('.add-to-cart-btn');
    if (cartBtn) {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) {
            alert("Please sign in to add items to your cart.");
            window.location.href = 'ClientSignIn.html';
            return;
        }

        const card = cartBtn.closest('.product-card');
        const name = cartBtn.getAttribute('data-name');
        const price = Number(cartBtn.getAttribute('data-price'));
        const size = card.querySelector('.cart-size-select').value;
        const customIdea = card.querySelector('.alteration-notes-input').value.trim() || 'None';

        try {
            await addDoc(collection(db, "cart"), {
                userEmail: user.email,
                itemName: name,
                price: price,
                size: size,
                customIdea: customIdea,
                timestamp: new Date()
            });
            updateHeaderBadges(user);
            alert(`${name} (Size: ${size}) added to cart!`);
        } catch (err) {
            alert(err.message);
        }
    }

    const wishBtn = e.target.closest('.add-to-wishlist-btn');
    if (wishBtn) {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) {
            alert("Please sign in to add items to your wishlist.");
            window.location.href = 'ClientSignIn.html';
            return;
        }

        const name = wishBtn.getAttribute('data-name');
        const price = Number(wishBtn.getAttribute('data-price'));
        const image = wishBtn.getAttribute('data-image');

        try {
            await addDoc(collection(db, "wishlist"), {
                userEmail: user.email,
                itemName: name,
                price: price,
                imageUrl: image,
                timestamp: new Date()
            });
            updateHeaderBadges(user);
            alert(`${name} added to your wishlist!`);
        } catch (err) {
            alert(err.message);
        }
    }
});

// --- AUTO-LOAD ALL PRODUCTS ON THE 'ALL' PAGE ---
document.addEventListener('DOMContentLoaded', () => {
    const allProductsGrid = document.getElementById('storefront-product-grid');
    if (allProductsGrid) {
        async function fetchAllCatalog() {
            const pagesToFetch = [
                'ClientWomen.html', 
                'ClientCurve.html', 
                'ClientKids.html', 
                'ClientMen.html', 
                'ClientAcessories.html'
            ];
            
            allProductsGrid.innerHTML = '<p style="text-align: center; width: 100%; grid-column: 1 / -1; padding: 40px; font-weight: bold; color: #1c2841; font-size: 1.2rem;">Gathering all collections...</p>';
            
            let combinedHTML = '';
            
            for (let page of pagesToFetch) {
                try {
                    const response = await fetch(page);
                    if (response.ok) {
                        const htmlText = await response.text();
                        const parser = new DOMParser();
                        const doc = parser.parseFromString(htmlText, 'text/html');
                        
                        const cards = doc.querySelectorAll('.product-card');
                        cards.forEach(card => {
                            combinedHTML += card.outerHTML;
                        });
                    }
                } catch (error) {
                    console.error('Error loading ' + page, error);
                }
            }
            
            allProductsGrid.innerHTML = combinedHTML || '<p style="text-align: center; width: 100%; grid-column: 1 / -1;">No products found.</p>';
        }
        
        fetchAllCatalog();
    }
});

const cartPageContainer = document.getElementById('cart-page-items-container');
if (cartPageContainer) {
    loadCartPageData();
}

const wishlistPageContainer = document.getElementById('wishlist-page-grid');
if (wishlistPageContainer) {
    loadWishlistPageData();
}

const chatContainer = document.getElementById('chat-messages-container');
if (chatContainer) {
    initTailorChat();
}

const searchInput = document.querySelector('.search-bar-dark input');
const searchBtn = document.querySelector('.search-bar-dark button');

if (searchInput) {
    const performSearch = () => {
        const filterText = searchInput.value.toLowerCase().trim();
        const cards = document.querySelectorAll('.product-card');
        
        cards.forEach(card => {
            const cardText = card.textContent.toLowerCase();
            if (cardText.includes(filterText)) {
                card.classList.remove('hide-product-card');
            } else {
                card.classList.add('hide-product-card');
            }
        });
    };

    searchInput.addEventListener('input', performSearch);
    if (searchBtn) {
        searchBtn.addEventListener('click', (e) => {
            e.preventDefault();
            performSearch();
        });
    }
}

const lightbox = document.createElement('div');
lightbox.className = 'image-lightbox-modal';
lightbox.innerHTML = `
    <span class="lightbox-close">×</span>
    <img class="lightbox-content" src="" alt="Full View">
`;
document.body.appendChild(lightbox);

const lightboxImg = lightbox.querySelector('.lightbox-content');
const lightboxClose = lightbox.querySelector('.lightbox-close');

function closeLightbox() {
    lightbox.classList.remove('active');
    setTimeout(() => { lightboxImg.src = ''; }, 300);
}

lightboxClose.addEventListener('click', closeLightbox);

lightbox.addEventListener('click', (e) => {
    if (e.target !== lightboxImg) {
        closeLightbox();
    }
});

document.addEventListener('click', (e) => {
    if (e.target.tagName === 'IMG') {
        if (e.target.closest('.logo') || 
            e.target.closest('.icon-group') || 
            e.target.closest('.circle-img-wrapper') ||
            e.target.classList.contains('lightbox-content')) {
            return; 
        }
        
        e.preventDefault();
        lightboxImg.src = e.target.src;
        lightbox.classList.add('active');
    }
});

async function loadCartPageData() {
    const container = document.getElementById('cart-page-items-container');
    const totalEl = document.getElementById('cart-page-total');
    const checkoutBtn = document.getElementById('cart-page-checkout-btn');

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            container.innerHTML = `<p style="text-align: center; color: #777; padding: 20px;">Please sign in to view your cart.</p>`;
            return;
        }

        try {
            const q = query(collection(db, "cart"), where("userEmail", "==", user.email));
            const snapshot = await getDocs(q);

            container.innerHTML = '';
            if (snapshot.empty) {
                container.innerHTML = `<p style="text-align: center; color: #777; padding: 20px;">Your cart is empty.</p>`;
                if (totalEl) totalEl.textContent = 'R 0.00';
                return;
            }

            let total = 0;
            snapshot.forEach((docSnap) => {
                const item = docSnap.data();
                const docId = docSnap.id;
                total += Number(item.price);

                const row = document.createElement('div');
                row.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 15px 0; border-bottom: 1px solid #eee;";
                row.innerHTML = `
                    <div>
                        <strong style="font-size: 1.1rem; color: #1c2841;">${item.itemName}</strong><br>
                        <span style="font-size: 0.9rem; color: #666;">Size: <b>${item.size}</b> | Custom Idea: <i>${item.customIdea}</i></span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 20px;">
                        <span style="font-weight: 800; color: #d96c06; font-size: 1.1rem;">R ${item.price}.00</span>
                        <button class="remove-cart-db-btn" data-id="${docId}" style="background: #ffebee; color: #d32f2f; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: bold;">Remove</button>
                    </div>
                `;
                container.appendChild(row);
            });

            if (totalEl) totalEl.textContent = `R ${total}.00`;

            container.querySelectorAll('.remove-cart-db-btn').forEach(btn => {
                btn.onclick = async () => {
                    const id = btn.getAttribute('data-id');
                    try {
                        await deleteDoc(doc(db, "cart", id));
                        loadCartPageData();
                        updateHeaderBadges(user);
                    } catch (err) {
                        alert(err.message);
                    }
                };
            });

            if (checkoutBtn) {
                checkoutBtn.onclick = () => {
                    const selectedPayment = document.querySelector('input[name="payment-method"]:checked');
                    const paymentMethod = selectedPayment ? selectedPayment.value.toUpperCase() : 'EFT';
                    alert(`Order placed successfully via ${paymentMethod}! Total: R ${total}.00`);
                };
            }
        } catch (err) {
            console.error(err);
        }
    });
}

async function loadWishlistPageData() {
    const grid = document.getElementById('wishlist-page-grid');

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            grid.innerHTML = `<p style="text-align: center; color: #777; padding: 20px; grid-column: 1 / -1;">Please sign in to view your wishlist.</p>`;
            return;
        }

        try {
            const q = query(collection(db, "wishlist"), where("userEmail", "==", user.email));
            const snapshot = await getDocs(q);

            grid.innerHTML = '';
            if (snapshot.empty) {
                grid.innerHTML = `<p style="text-align: center; color: #777; padding: 20px; grid-column: 1 / -1;">Your wishlist is empty.</p>`;
                return;
            }

            snapshot.forEach((docSnap) => {
                const item = docSnap.data();
                const docId = docSnap.id;

                const card = document.createElement('article');
                card.className = "product-card";
                card.style.cssText = "background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); display: flex; flex-direction: column;";
                card.innerHTML = `
                    <div style="width: 100%; height: 320px; overflow: hidden; background: #f9f9f9; position: relative;">
                        <img src="${item.imageUrl}" alt="${item.itemName}" style="width: 100%; height: 100%; object-fit: cover; object-position: top;">
                    </div>
                    <div style="padding: 20px; display: flex; flex-direction: column; gap: 10px; flex: 1;">
                        <h3 style="font-size: 1.1rem; font-weight: 700; color: #1c2841; margin: 0;">${item.itemName}</h3>
                        <p style="font-weight: 800; color: #d96c06; font-size: 1.2rem; margin: 0;">R ${item.price}.00</p>
                        <button class="remove-wishlist-db-btn" data-id="${docId}" style="background: #ffebee; color: #d32f2f; border: none; padding: 10px; border-radius: 6px; cursor: pointer; font-weight: bold; margin-top: auto;">Remove from Wishlist</button>
                    </div>
                `;
                grid.appendChild(card);
            });

            grid.querySelectorAll('.remove-wishlist-db-btn').forEach(btn => {
                btn.onclick = async () => {
                    const id = btn.getAttribute('data-id');
                    try {
                        await deleteDoc(doc(db, "wishlist", id));
                        loadWishlistPageData();
                        updateHeaderBadges(user);
                    } catch (err) {
                        alert(err.message);
                    }
                };
            });
        } catch (err) {
            console.error(err);
        }
    });
}

// ==========================================
// TRACK ORDERS LOGIC (Customer Facing)
// ==========================================
const trackForm = document.getElementById("track-order-form");
const trackInput = document.getElementById("track-order-input");
const resultsArea = document.getElementById("track-results-area");

function getCustomerName(data) {
    if (data.clientFirstName || data.clientSurname) {
        return `${data.clientFirstName || ""} ${data.clientSurname || ""}`.trim();
    }
    return data.customer || "Customer";
}

function getOrderDateText(data) {
    if (data.orderDate) {
        return data.orderDate;
    }
    if (data.timestamp && typeof data.timestamp.toDate === "function") {
        return data.timestamp.toDate().toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric"
        });
    }
    return "Date pending";
}

function getStatusBadgeClass(status) {
    const normalized = (status || "").toLowerCase();
    if (normalized.includes("complet") || normalized.includes("paid") || normalized.includes("ready")) {
        return "status-completed";
    }
    if (normalized.includes("progress") || normalized.includes("cut") || normalized.includes("sew")) {
        return "status-progress";
    }
    return "status-pending";
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&")
        .replace(/</g, "<")
        .replace(/>/g, ">")
        .replace(/"/g, """);
}

if (trackForm && trackInput && resultsArea) {
    trackForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const searchTerm = trackInput.value.trim().toLowerCase();
        if (!searchTerm) return;

        resultsArea.innerHTML = `<div class="empty-state"><p>Searching orders...</p></div>`;

        try {
            const [ordersSnap, paymentsSnap] = await Promise.all([
                getDocs(collection(db, "orders")),
                getDocs(collection(db, "payments"))
            ]);

            const paymentsByOrder = {};
            paymentsSnap.forEach((docSnap) => {
                const pay = docSnap.data();
                const key = String(pay.orderId || "").trim().toLowerCase();
                if (key) {
                    paymentsByOrder[key] = (paymentsByOrder[key] || 0) + Number(pay.amount || 0);
                }
            });

            const matches = [];
            ordersSnap.forEach((docSnap) => {
                const data = docSnap.data();
                const orderNum = String(data.orderNumber || "").trim();
                const customerName = getCustomerName(data);
                const matchesOrder = orderNum.toLowerCase().includes(searchTerm);
                const matchesCustomer = customerName.toLowerCase().includes(searchTerm);

                if (matchesOrder || matchesCustomer) {
                    matches.push({ id: docSnap.id, ...data, customerName, orderNum });
                }
            });

            if (matches.length === 0) {
                resultsArea.innerHTML = `
                    <div class="empty-state">
                        <p>No orders matched "<strong>${escapeHtml(trackInput.value.trim())}</strong>". Check your order number or name and try again.</p>
                    </div>
                `;
                return;
            }

            resultsArea.innerHTML = matches.map((order) => {
                const totalAmount = Number(order.amount || 0);
                const paidAmount = paymentsByOrder[order.orderNum.toLowerCase()] || 0;
                const balanceDue = Math.max(0, totalAmount - paidAmount);
                const statusText = order.status || "Pending";
                const badgeClass = getStatusBadgeClass(statusText);

                return `
                    <div class="order-card">
                        <div class="order-top">
                            <div>
                                <div class="order-number">${escapeHtml(order.orderNum || "Order")}</div>
                                <div class="order-date">Order Date: ${escapeHtml(getOrderDateText(order))}</div>
                            </div>
                            <span class="status-pill ${badgeClass}">${escapeHtml(statusText)}</span>
                        </div>
                        <div class="order-details-grid">
                            <div class="detail-box">
                                <div class="detail-label">Customer</div>
                                <div class="detail-value">${escapeHtml(order.customerName)}</div>
                            </div>
                            <div class="detail-box">
                                <div class="detail-label">Garment / Item</div>
                                <div class="detail-value">${escapeHtml(order.description || "Custom Garment")}</div>
                            </div>
                            <div class="detail-box">
                                <div class="detail-label">Fabric</div>
                                <div class="detail-value">${escapeHtml(order.fabricType || "Standard")}</div>
                            </div>
                        </div>
                        <div class="payment-summary">
                            <span>Total: <strong>R ${totalAmount.toFixed(2)}</strong></span>
                            <span>Paid: <strong>R ${paidAmount.toFixed(2)}</strong></span>
                            <span class="${balanceDue === 0 ? "balance-clear" : "balance-due"}">
                                ${balanceDue === 0 ? "Fully Paid" : `Balance Due: R ${balanceDue.toFixed(2)}`}
                            </span>
                        </div>
                    </div>
                `;
            }).join("");
        } catch (err) {
            resultsArea.innerHTML = `
                <div class="empty-state">
                    <p>Unable to look up orders right now: ${escapeHtml(err.message)}</p>
                </div>
            `;
        }
    });
}
function injectProfileModal() {
    if (document.getElementById('edit-profile-modal')) return;

    const modalHtml = `
        <div id="edit-profile-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.6); z-index: 9999999; justify-content: center; align-items: center;">
            <div style="background: white; padding: 30px; border-radius: 12px; width: 90%; max-width: 450px; box-shadow: 0 10px 30px rgba(0,0,0,0.2);">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0; color: #1c2841; font-size: 1.3rem;">Edit Personal Info</h3>
                    <button id="close-profile-modal" style="background: none; border: none; font-size: 1.8rem; cursor: pointer; color: #777;">×</button>
                </div>
                <form id="edit-profile-form">
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; font-size: 0.85rem; font-weight: bold; margin-bottom: 5px; color: #333;">First Name</label>
                        <input type="text" id="edit-prof-fname" required style="width: 100%; padding: 12px; border: 1px solid #ccc; border-radius: 6px; outline: none;">
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; font-size: 0.85rem; font-weight: bold; margin-bottom: 5px; color: #333;">Surname</label>
                        <input type="text" id="edit-prof-sname" required style="width: 100%; padding: 12px; border: 1px solid #ccc; border-radius: 6px; outline: none;">
                    </div>
                    <div style="margin-bottom: 15px;">
                        <label style="display: block; font-size: 0.85rem; font-weight: bold; margin-bottom: 5px; color: #333;">Phone Number</label>
                        <input type="text" id="edit-prof-phone" required style="width: 100%; padding: 12px; border: 1px solid #ccc; border-radius: 6px; outline: none;">
                    </div>
                    <div style="margin-bottom: 25px;">
                        <label style="display: block; font-size: 0.85rem; font-weight: bold; margin-bottom: 5px; color: #333;">Delivery Address</label>
                        <textarea id="edit-prof-address" placeholder="Enter your full shipping address..." style="width: 100%; padding: 12px; border: 1px solid #ccc; border-radius: 6px; resize: vertical; height: 80px; outline: none;"></textarea>
                    </div>
                    <button type="submit" style="width: 100%; padding: 14px; background: #d96c06; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 1rem; transition: 0.2s;">Save Changes</button>
                </form>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    document.getElementById('close-profile-modal').onclick = (e) => {
        e.preventDefault();
        document.getElementById('edit-profile-modal').style.display = 'none';
    };
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        injectProfileModal();
        
        setTimeout(() => {
            const logoutBtn = document.getElementById('global-logout-btn');
            if (logoutBtn && !document.getElementById('edit-profile-trigger-btn')) {
                
                const editBtn = document.createElement('button');
                editBtn.id = 'edit-profile-trigger-btn';
                editBtn.innerHTML = '<i class="fas fa-user-edit"></i> Edit';
                editBtn.style.cssText = "background: transparent; color: #1c2841; border: 1px solid #1c2841; padding: 4px 10px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 0.8rem; margin-right: 5px;";
                
                logoutBtn.parentNode.insertBefore(editBtn, logoutBtn);

                editBtn.onclick = async (e) => {
                    e.preventDefault();
                    document.getElementById('edit-profile-modal').style.display = 'flex';
                    
                    try {
                        const q = query(collection(db, "clients"), where("email", "==", user.email));
                        const snap = await getDocs(q);
                        
                        if (!snap.empty) {
                            const docData = snap.docs[0].data();
                            document.getElementById('edit-prof-fname').value = docData.firstName || '';
                            document.getElementById('edit-prof-sname').value = docData.surname || '';
                            document.getElementById('edit-prof-phone').value = docData.phone || '';
                            document.getElementById('edit-prof-address').value = docData.deliveryAddress || '';
                            
                            document.getElementById('edit-profile-form').dataset.docId = snap.docs[0].id;
                        }
                    } catch (err) {
                        console.error(err);
                    }
                };
            }
        }, 1000);
    }
});

document.addEventListener('submit', async (e) => {
    if (e.target.id === 'edit-profile-form') {
        e.preventDefault();
        
        const docId = e.target.dataset.docId;
        if (!docId) return;

        const fname = document.getElementById('edit-prof-fname').value.trim();
        const sname = document.getElementById('edit-prof-sname').value.trim();
        const phone = document.getElementById('edit-prof-phone').value.trim();
        const address = document.getElementById('edit-prof-address').value.trim();
        const fullName = `${fname} ${sname}`; 

        try {
            await updateDoc(doc(db, "clients", docId), {
                firstName: fname,
                surname: sname,
                fullName: fullName,
                phone: phone,
                deliveryAddress: address
            });
            
            const custQ = query(collection(db, "customers"), where("email", "==", auth.currentUser.email));
            const custSnap = await getDocs(custQ);
            if (!custSnap.empty) {
                await updateDoc(doc(db, "customers", custSnap.docs[0].id), {
                    fullName: fullName,
                    phone: phone
                });
            }

            alert("Personal information updated successfully!");
            document.getElementById('edit-profile-modal').style.display = 'none';
            
            sessionStorage.setItem(`userName_${auth.currentUser.email}`, fullName);
            window.location.reload(); 

        } catch (err) {
            alert(err.message);
        }
    }
});