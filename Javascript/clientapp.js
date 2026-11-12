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

                authContainer.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px; background: rgba(255,255,255,0.1); padding: 6px 14px; border-radius: 25px;">
                        <i class="far fa-user" style="color: #d96c06;"></i>
                        <span style="color: #1c2841; font-weight: 700; font-size: 0.9rem;">Hi, ${formatCleanFullName(firstName)}</span>
                        <button id="global-logout-btn" style="background-color: #fcd34d !important; color: #1c2841 !important; border: none; padding: 4px 10px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 0.8rem;" title="Sign Out">Logout</button>
                    </div>
                `;

                const logoutBtn = document.getElementById('global-logout-btn');
                if (logoutBtn) {
                    logoutBtn.onclick = async () => {
                        await signOut(auth);
                        window.location.reload();
                    };
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
        try {
            const cartQuery = query(collection(db, "cart"), where("userEmail", "==", user.email));
            const cartSnap = await getDocs(cartQuery);
            if (cartCountEl) cartCountEl.textContent = cartSnap.size;

            const wishQuery = query(collection(db, "wishlist"), where("userEmail", "==", user.email));
            const wishSnap = await getDocs(wishQuery);
            if (wishlistCountEl) wishlistCountEl.textContent = wishSnap.size;
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
        signOut(auth).then(() => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.replace('../index.html');
        }).catch((error) => {
            alert("Error logging out: " + error.message);
        });
    }
});

const clientPortalForm = document.getElementById('client-portal-form');
if (clientPortalForm) {
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

        const bust = document.getElementById('cp-bust').value;
        const waist = document.getElementById('cp-waist').value;
        const hips = document.getElementById('cp-hips').value;
        const shoulder = document.getElementById('cp-shoulder').value;
        const length = document.getElementById('cp-length').value;

        if (!bust || !waist || !hips || !shoulder || !length) {
            alert("All body measurements are required.");
            return;
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
                    bust: Number(bust),
                    waist: Number(waist),
                    hips: Number(hips),
                    shoulder: Number(shoulder),
                    length: Number(length),
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

                await addDoc(collection(db, "orders"), {
                    orderNumber: newOrderNumber,
                    customer: fullNameClean,
                    clientFirstName: firstName,
                    clientSurname: surname,
                    email: user.email,
                    orderDate: new Date().toISOString().split('T')[0],
                    description: `Custom Clothing: ${garment} (Notes: ${notes})`,
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
                alert(`Success! Your custom order request (${newOrderNumber}) has been submitted.`);
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
                                bubble.style.cssText = `max-width: 70%; padding: 10px 15px; border-radius: 10px; font-size: 14px; align-self: ${isClient ? 'flex-end' : 'flex-start'}; background: ${isClient ? '#2b7a78' : '#e0f2f1'}; color: ${isClient ? 'white' : '#333'};`;
                                bubble.innerHTML = `<strong>${isClient ? 'You' : 'Tailor Team'}:</strong><br>${msg.text}`;
                                chatMessagesContainer.appendChild(bubble);
                            }
                        });

                        if (count === 0) {
                            chatMessagesContainer.innerHTML = `<p style="color: #777; text-align: center;">No messages yet.</p>`;
                        }
                        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight;
                    } catch (err) {
                        console.error("Error loading chat:", err);
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
                            alert("Failed to send message: " + err.message);
                        }
                    };
                }
            }

        } catch (err) {
            console.error("Error loading client account data:", err);
        }
    }
});

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.fa-headset').forEach(icon => {
        const parentLink = icon.closest('a');
        if (parentLink) {
            parentLink.href = 'clientmessages.html';
        }
    });

    document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const user = auth.currentUser;
            if (!user) {
                alert("Please sign in to add items to your cart.");
                window.location.href = 'ClientSignIn.html';
                return;
            }

            const card = e.target.closest('.product-card');
            const name = btn.getAttribute('data-name');
            const price = Number(btn.getAttribute('data-price'));
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
                alert("Error adding to cart: " + err.message);
            }
        });
    });

    document.querySelectorAll('.add-to-wishlist-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const user = auth.currentUser;
            if (!user) {
                alert("Please sign in to add items to your wishlist.");
                window.location.href = 'ClientSignIn.html';
                return;
            }

            const name = btn.getAttribute('data-name');
            const price = Number(btn.getAttribute('data-price'));
            const image = btn.getAttribute('data-image');

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
                alert("Error adding to wishlist: " + err.message);
            }
        });
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
                        alert("Error removing item: " + err.message);
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
                        alert("Error removing item: " + err.message);
                    }
                };
            });
        } catch (err) {
            console.error(err);
        }
    });
}

function initTailorChat() {
    const chatContainer = document.getElementById('chat-messages-container');
    const chatForm = document.getElementById('chat-send-form');
    const chatInput = document.getElementById('chat-input-text');

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            chatContainer.innerHTML = `<p style="text-align: center; color: #777; padding: 20px;">Please sign in to chat with the tailor team.</p>`;
            return;
        }

        async function fetchMessages() {
            try {
                const q = query(collection(db, "messages"), orderBy("timestamp", "asc"));
                const snapshot = await getDocs(q);

                chatContainer.innerHTML = '';
                let count = 0;

                snapshot.forEach((docSnap) => {
                    const msg = docSnap.data();
                    if (msg.userEmail === user.email || msg.clientEmail === user.email) {
                        count++;
                        const isClient = msg.sender === 'client';
                        const bubble = document.createElement('div');
                        bubble.style.cssText = `max-width: 70%; padding: 12px 18px; border-radius: 10px; font-size: 14px; align-self: ${isClient ? 'flex-end' : 'flex-start'}; background: ${isClient ? '#d96c06' : '#f4f7f6'}; color: ${isClient ? 'white' : '#1c2841'}; box-shadow: 0 2px 5px rgba(0,0,0,0.05);`;
                        bubble.innerHTML = `<strong>${isClient ? 'You' : 'Tailor Team'}:</strong><br>${msg.text}`;
                        chatContainer.appendChild(bubble);
                    }
                });

                if (count === 0) {
                    chatContainer.innerHTML = `<p style="color: #777; text-align: center;">No messages yet. Start a conversation with our tailor team below!</p>`;
                }
                chatContainer.scrollTop = chatContainer.scrollHeight;
            } catch (err) {
                console.error("Error loading messages:", err);
            }
        }

        fetchMessages();

        if (chatForm && !chatForm.hasAttribute('data-bound')) {
            chatForm.setAttribute('data-bound', 'true');
            chatForm.onsubmit = async (e) => {
                e.preventDefault();
                const text = chatInput.value.trim();
                if (!text) return;

                try {
                    await addDoc(collection(db, "messages"), {
                        userEmail: user.email,
                        clientEmail: user.email,
                        sender: 'client',
                        text: text,
                        timestamp: new Date()
                    });

                    chatInput.value = '';
                    fetchMessages();
                } catch (err) {
                    alert("Failed to send message: " + err.message);
                }
            };
        }
    });
}

const translations = {
    en: {
        "nav-all": "All",
        "nav-women": "Women",
        "nav-curve": "Curve",
        "nav-kids": "Kids",
        "nav-men": "Men",
        "nav-traditional": "Traditional Attire",
        "nav-accessories": "Accessories",
        "hero-title": "NEW ARRIVALS<br>STREET & TRADITIONAL",
        "hero-sub": "Discover the latest drops. Premium quality, expertly tailored.",
        "hero-btn": "SHOP THE COLLECTION",
        "cat-women": "Women",
        "cat-curve": "Curve",
        "cat-kids": "Kids",
        "cat-men": "Men",
        "cat-traditional": "Traditional",
        "cat-accessories": "Accessories"
    },
    zu: {
        "nav-all": "Konke",
        "nav-women": "Abesifazane",
        "nav-curve": "Ama-Curve",
        "nav-kids": "Izingane",
        "nav-men": "Abesilisa",
        "nav-traditional": "Izingubo Zesintu",
        "nav-accessories": "Izesekeli",
        "hero-title": "OKUSHA OKUFIKILE<br>KWESIMANJE NOSIKO",
        "hero-sub": "Thola okusha. Ikhwalithi ephezulu, kuthungwe ngobunyoninco.",
        "hero-btn": "THENGA IQOQO",
        "cat-women": "Abesifazane",
        "cat-curve": "Ama-Curve",
        "cat-kids": "Izingane",
        "cat-men": "Abesilisa",
        "cat-traditional": "Ezesintu",
        "cat-accessories": "Izesekeli"
    },
    xh: {
        "nav-all": "Konke",
        "nav-women": "Abafazi",
        "nav-curve": "Goso",
        "nav-kids": "Abantwana",
        "nav-men": "Amadoda",
        "nav-traditional": "Iimpahla Zesintu",
        "nav-accessories": "Izincedisi",
        "hero-title": "EZINTSHA EZIFIKILEYO<br>EZEZITALATO NESINTU",
        "hero-sub": "Fumanisa ezamva nje. Umgangatho ophezulu, zithungwe ngobuchule.",
        "hero-btn": "THENGA INGQOKELELA",
        "cat-women": "Abafazi",
        "cat-curve": "Goso",
        "cat-kids": "Abantwana",
        "cat-men": "Amadoda",
        "cat-traditional": "Ezesintu",
        "cat-accessories": "Izincedisi"
    },
    st: {
        "nav-all": "Tsohle",
        "nav-women": "Basali",
        "nav-curve": "Mekolokolo",
        "nav-kids": "Bana",
        "nav-men": "Banna",
        "nav-traditional": "Liaparo tsa Setso",
        "nav-accessories": "Lisebelisoa",
        "hero-title": "TSE NCHA TSE FIHLILENG<br>TSA SEJWALEJWALE LE TSA SETSO",
        "hero-sub": "Fumana tse ncha. Boleng bo phahameng, tse rokilweng hantle.",
        "hero-btn": "REKA KOKETSO",
        "cat-women": "Basali",
        "cat-curve": "Mekolokolo",
        "cat-kids": "Bana",
        "cat-men": "Banna",
        "cat-traditional": "Setso",
        "cat-accessories": "Lisebelisoa"
    }
};

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.lang-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const selectedLang = this.getAttribute('data-lang');
            
            document.querySelectorAll('[data-translate]').forEach(element => {
                const key = element.getAttribute('data-translate');
                if (translations[selectedLang] && translations[selectedLang][key]) {
                    element.innerHTML = translations[selectedLang][key];
                }
            });
        });
    });

    document.querySelectorAll('.curr-btn').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            const selectedCurr = this.getAttribute('data-curr');
            
            document.querySelectorAll('.dynamic-price').forEach(priceElement => {
                if (selectedCurr === 'zar') {
                    const zarPrice = priceElement.getAttribute('data-price-zar');
                    if (zarPrice) priceElement.textContent = `R ${zarPrice}`;
                } else if (selectedCurr === 'usd') {
                    const usdPrice = priceElement.getAttribute('data-price-usd');
                    if (usdPrice) priceElement.textContent = `$ ${usdPrice}`;
                }
            });
        });
    });

    document.querySelectorAll('.product-card').forEach(card => {
        const checkbox = card.querySelector('.enable-alteration-checkbox');
        const textarea = card.querySelector('.alteration-notes-input');
        if (checkbox && textarea) {
            checkbox.addEventListener('change', () => {
                textarea.style.display = checkbox.checked ? 'block' : 'none';
            });
        }
    });
});