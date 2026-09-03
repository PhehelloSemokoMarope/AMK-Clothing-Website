import { initializeApp } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, doc, updateDoc, where } from "https://www.gstatic.com/firebasejs/10.4.0/firebase-firestore.js";
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

function ensureClientUniversalHeader() {
    const headerRightContainers = document.querySelectorAll('.top-header .header-right');
    
    headerRightContainers.forEach(container => {
        if (!container.querySelector('.profile-info')) {
            const existingLogoutBtn = container.querySelector('.logout-btn') || container.querySelector('button');
            const logoutBtnHtml = existingLogoutBtn ? existingLogoutBtn.outerHTML : '<button class="logout-btn" id="client-logout-btn">Logout</button>';
            
            container.innerHTML = `
                <div class="profile-info" style="display: flex; align-items: center; gap: 10px;">
                    <img src="../Images/user.png" alt="Profile" class="profile-icon" style="width: 32px; height: 32px; border-radius: 50%;">
                    <div class="profile-text" style="display: flex; flex-direction: column; text-align: left;">
                      <span class="profile-name" id="header-client-name" style="font-weight: bold; font-size: 13px; color: #333;">Loading...</span>
                      <span class="profile-role" id="header-client-role" style="font-size: 11px; color: #777;">Please wait</span>
                    </div>
                </div>
                ${logoutBtnHtml}
            `;
        }
    });
}

ensureClientUniversalHeader();

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

            alert('Registration successful! You can now sign in to your client portal.');
            window.location.replace('ClientSignIn.html');
        } catch (error) {
            alert('Registration failed: ' + error.message);
        }
    });
}

const clientLoginForm = document.getElementById('client-login-form');
if (clientLoginForm) {
    clientLoginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('client-email').value.trim();
        const password = document.getElementById('client-password').value;

        signInWithEmailAndPassword(auth, email, password)
            .then(() => {
                window.location.replace('ClientPortal.html');
            })
            .catch((error) => {
                alert("Sign in failed: " + error.message);
            });
    });
}

document.addEventListener('click', (e) => {
    const logoutTarget = e.target.closest('.logout-btn');
    if (logoutTarget) {
        e.preventDefault();
        signOut(auth).then(() => {
            localStorage.clear();
            sessionStorage.clear();
            window.location.replace('ClientSignIn.html');
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
            alert("All body measurements (Bust, Waist, Hips, Shoulder, Length) are required to submit a custom order request.");
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
                alert(`Success! Your custom order request (${newOrderNumber}) and reference photo have been submitted to the design team.`);
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
                alert("Proof of payment submitted successfully! The design team will review and approve it shortly.");
            } catch (err) {
                alert("Error uploading proof of payment: " + err.message);
            }
        };

        reader.readAsDataURL(file);
    });
}

const clientOrdersTableBody = document.getElementById('client-orders-table-body');
const checkoutFormEl = document.getElementById('checkout-form');
const chatMessagesContainer = document.getElementById('chat-messages-container');

onAuthStateChanged(auth, async (user) => {
    ensureClientUniversalHeader();
    const currentPage = window.location.pathname.toLowerCase();
    const isClientAuthPage = currentPage.includes('clientsignin') || currentPage.includes('clientsignup');

    if (!user && !isClientAuthPage) {
        window.location.replace('ClientSignIn.html');
        return;
    }
    if (user && isClientAuthPage) {
        window.location.replace('ClientPortal.html');
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
                    clientOrdersTableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #777;">No orders found for your account. Submit your first order using the portal!</td></tr>`;
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
                                    <p>Test thank you note</p>
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
                            chatMessagesContainer.innerHTML = `<p style="color: #777; text-align: center;">No messages yet. Send a message to start communicating with your tailor!</p>`;
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

const cartState = {
    items: [],
    total: 0
};

async function loadStorefrontProducts() {
    const storefrontContainer = document.getElementById('storefront-product-grid');
    if (!storefrontContainer) return;

    const catalogItems = [
        { name: "Asymmetrical Puff-Sleeve Midi Dress", color: "Solid Black", price: 850, image: "../Images/Outfit_Pics/Image (1).jpg" },
        { name: "Striped Corset Top & Printed Pant Set", color: "Gold Stripe & Maroon Floral", price: 1200, image: "../Images/Outfit_Pics/Image (2).jpg" },
        { name: "Collared Pleated Tennis Dress", color: "Black and White Trim", price: 650, image: "../Images/Outfit_Pics/Image (3).jpg" },
        { name: "Structured Puff-Sleeve Cocktail Dress", color: "Solid Black", price: 780, image: "../Images/Outfit_Pics/Image (4).jpg" },
        { name: "Sleeveless Pleated Mini Dress", color: "Black with White Accents", price: 600, image: "../Images/Outfit_Pics/Image (5).jpg" },
        { name: "Industrial Reflective Work Shirt", color: "Navy Blue with Silver Tape", price: 450, image: "../Images/Outfit_Pics/Image (6).jpg" },
        { name: "Traditional African Print Statement Dress", color: "Red, Black & Gold Print", price: 1100, image: "../Images/Outfit_Pics/Image (7).jpg" },
        { name: "Two-Tone Heavy-Duty Work Shirt", color: "Royal Blue & Black", price: 480, image: "../Images/Outfit_Pics/Image (8).jpg" },
        { name: "High-Visibility Safety Vest", color: "Red with Double Silver Tape", price: 250, image: "../Images/Outfit_Pics/Image (9).jpg" },
        { name: "Industrial Two-Tone Safety Shirt", color: "Red & Navy Blue", price: 490, image: "../Images/Outfit_Pics/Image (10).jpg" },
        { name: "High-Visibility Safety Vest with Pockets", color: "Neon Yellow & Navy Blue", price: 280, image: "../Images/Outfit_Pics/Image (11).jpg" },
        { name: "Medical Scrubs Set", color: "Vibrant Red", price: 500, image: "../Images/Outfit_Pics/Image (12).jpg" },
        { name: "Letterman Varsity Jacket", color: "Navy Blue & White with 'A' Patch", price: 890, image: "../Images/Outfit_Pics/Image (13).jpg" },
        { name: "School Blazer with Gold Trim", color: "Navy Blue with Gold Crest", price: 750, image: "../Images/Outfit_Pics/Image (14).jpg" },
        { name: "Matching Choir Dress Set", color: "Purple Top & Green Floral Skirt", price: 1150, image: "../Images/Outfit_Pics/Image (15).jpg" },
        { name: "Elegance High-Low Evening Gown", color: "Purple with Floral Skirt Accent", price: 1400, image: "../Images/Outfit_Pics/Image (16).jpg" },
        { name: "Traditional Cultural Dress", color: "Pink, Blue & Red", price: 950, image: "../Images/Outfit_Pics/Image (17).jpg" },
        { name: "Traditional Patterned Long Kimono", color: "Deep Maroon with Patterned Trim", price: 880, image: "../Images/Outfit_Pics/Image (18).jpg" },
        { name: "Beaded Lace Ball Gown", color: "Midnight Black", price: 1600, image: "../Images/Outfit_Pics/Image (19).jpg" },
        { name: "Ruffled Satin Cocktail Dress", color: "Bright Pink / Rose", price: 920, image: "../Images/Outfit_Pics/Image (20).jpg" },
        { name: "Traditional African Print Top", color: "Black with White Geometric Print", price: 450, image: "../Images/Outfit_Pics/Image (21).jpg" },
        { name: "Decorative Fabric Bow Stick", color: "Solid Red", price: 120, image: "../Images/Outfit_Pics/Image (22).jpg" },
        { name: "Traditional Collar Shirt", color: "Mustard Gold with Patterned Accents", price: 520, image: "../Images/Outfit_Pics/Image (23).jpg" },
        { name: "Canvas Fabric Storage Bin", color: "Burlap & Red", price: 180, image: "../Images/Outfit_Pics/Image (24).jpg" },
        { name: "Handcrafted Fabric Bow Accents Bundle", color: "Solid Red", price: 300, image: "../Images/Outfit_Pics/Image (25).jpg" },
        { name: "Glitter Mermaid Prom Dress", color: "Silver Grey with Leg Slit", price: 1500, image: "../Images/Outfit_Pics/Image (26).jpg" },
        { name: "Traditional Striped Collar Shirt", color: "White with Multi-Colored Striping", price: 540, image: "../Images/Outfit_Pics/Image (27).jpg" },
        { name: "Puff-Sleeve Bow Blouse & Skirt Set", color: "Red Floral Top & Cream Skirt", price: 1250, image: "../Images/Outfit_Pics/Image (28).jpg" },
        { name: "Glitter Mermaid Gown (Side Profile)", color: "Silver Grey", price: 1500, image: "../Images/Outfit_Pics/Image (29).jpg" },
        { name: "Beaded Lace Ball Gown with Tulle", color: "Black", price: 1650, image: "../Images/Outfit_Pics/Image (30).jpg" },
        { name: "Handcrafted Suede Hair Bow", color: "Deep Rust Orange", price: 150, image: "../Images/Outfit_Pics/Image (31).jpg" },
        { name: "Waterproof Winter Puffer Jacket", color: "Cyan Blue & Black", price: 950, image: "../Images/Outfit_Pics/Image (32).jpg" },
        { name: "Ruffled Collar Formal Interview Dress", color: "Sky Blue", price: 1100, image: "../Images/Outfit_Pics/Image (33).jpg" },
        { name: "Abstract Print Wrap Dress", color: "Black & White Abstract", price: 980, image: "../Images/Outfit_Pics/Image (34).jpg" },
        { name: "Beaded Embellished Flare Dress", color: "Sky Blue with Rhinestones", price: 1350, image: "../Images/Outfit_Pics/Image (35).jpg" },
        { name: "Custom Branded Event Puffer Jackets", color: "Navy Blue with Photo Collage Print", price: 1050, image: "../Images/Outfit_Pics/Image (36).jpg" },
        { name: "Fringe Hem Two-Tone Dress", color: "White & Mustard Gold with Fringes", price: 1200, image: "../Images/Outfit_Pics/Image (37).jpg" },
        { name: "Heavy Winter Parka Jacket", color: "Maroon with Reflective Tape", price: 980, image: "../Images/Outfit_Pics/Image (38).jpg" },
        { name: "Dramatic Ruffle-Collar Ball Gown", color: "Deep Magenta / Rose", price: 1550, image: "../Images/Outfit_Pics/Image (39).jpg" },
        { name: "Winter Puffer Jacket (Hanging)", color: "Maroon with Reflective Tape", price: 980, image: "../Images/Outfit_Pics/Image (40).jpg" }
    ];

    try {
        const q = query(collection(db, "inventory"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);

        let dbProducts = [];
        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const category = (data.category || '').toLowerCase();
            if (category.includes('ready') || category.includes('clothing') || category.includes('garment') || category.includes('retail')) {
                dbProducts.push({
                    id: docSnap.id,
                    name: data.itemName || 'Garment',
                    color: data.color || 'Standard',
                    price: Number(data.cost || 500),
                    image: data.imageUrl || '../Images/Outfit_Pics/Image (1).jpg'
                });
            }
        });

        const finalProducts = dbProducts.length > 0 ? dbProducts : catalogItems;

        storefrontContainer.innerHTML = '';
        
        finalProducts.forEach((item, index) => {
            const itemCard = document.createElement('div');
            itemCard.className = "metric-card";
            itemCard.style.cssText = "background: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.03); display: flex; flex-direction: column; gap: 10px;";
            
            itemCard.innerHTML = `
                <img src="${item.image || '../Images/Outfit_Pics/Image (1).jpg'}" alt="${item.name}" style="width: 100%; height: 220px; object-fit: contain; background: #f9f9f9; border-radius: 8px; margin-bottom: 5px;">
                <h3 style="color: #1a1a1a; margin: 0; font-size: 1.05rem; font-weight: bold;">${item.name}</h3>
                <p style="margin: 0; color: #777; font-size: 0.85rem;">Color: ${item.color}</p>
                <p style="margin: 0; font-weight: bold; font-size: 1.1rem; color: #2b7a78;">R${item.price}</p>
                
                <div style="display: flex; gap: 10px; margin-top: 10px;">
                    <select class="cart-size-select" style="padding: 10px; border-radius: 8px; border: 1px solid #ddd; outline: none; font-size: 0.9rem;">
                        <option value="S">Small (S)</option>
                        <option value="M" selected>Medium (M)</option>
                        <option value="L">Large (L)</option>
                        <option value="XL">X-Large (XL)</option>
                    </select>
                </div>
                <div style="margin-top: 8px;">
                    <label style="font-size: 12px; color: #555; display: flex; align-items: center; gap: 5px; cursor: pointer;">
                        <input type="checkbox" class="enable-alteration-checkbox"> Request Alterations (+Changes)
                    </label>
                    <input type="text" class="alteration-notes-input" placeholder="e.g. remove puffy sleeves" style="width: 100%; padding: 8px; margin-top: 5px; border: 1px solid #ddd; border-radius: 6px; font-size: 12px; display: none;">
                </div>
                <button class="btn-primary add-to-cart-btn" data-id="${item.id || 'catalog-' + index}" data-name="${item.name}" data-price="${item.price}" style="width: 100%; margin-top: 10px; padding: 10px; font-size: 0.9rem;">Add to Cart</button>
            `;

            const alterationCheckbox = itemCard.querySelector('.enable-alteration-checkbox');
            const alterationInput = itemCard.querySelector('.alteration-notes-input');
            alterationCheckbox.onchange = () => {
                alterationInput.style.display = alterationCheckbox.checked ? 'block' : 'none';
            };

            storefrontContainer.appendChild(itemCard);
        });

        const addToCartButtons = storefrontContainer.querySelectorAll('.add-to-cart-btn');
        addToCartButtons.forEach(btn => {
            btn.onclick = (e) => {
                const card = e.target.closest('div').parentElement;
                const sizeSelect = card.querySelector('.cart-size-select');
                const alterationCheckbox = card.querySelector('.enable-alteration-checkbox');
                const alterationInput = card.querySelector('.alteration-notes-input');
                
                const itemName = btn.getAttribute('data-name');
                const itemPrice = Number(btn.getAttribute('data-price'));
                const selectedSize = sizeSelect.value;
                const alterationText = alterationCheckbox.checked ? alterationInput.value.trim() : 'None';

                cartState.items.push({
                    name: itemName,
                    price: itemPrice,
                    size: selectedSize,
                    alterations: alterationText
                });
                
                cartState.total += itemPrice;

                updateCartUI();
                alert(`${itemName} (Size: ${selectedSize}) added to cart!`);
            };
        });

    } catch (error) {
        console.error("Error loading products:", error);
    }
}

function updateCartUI() {
    const cartCountEl = document.getElementById('cart-item-count');
    const cartTotalEl = document.getElementById('cart-total-amount');
    const cartItemsContainer = document.getElementById('cart-items-container');

    if (cartCountEl) cartCountEl.textContent = cartState.items.length;
    if (cartTotalEl) cartTotalEl.textContent = `R${cartState.total}`;

    if (cartItemsContainer) {
        cartItemsContainer.innerHTML = '';
        if (cartState.items.length === 0) {
            cartItemsContainer.innerHTML = `<p style="color: #777; text-align: center;">Your cart is empty.</p>`;
            return;
        }

        cartState.items.forEach((cartItem, index) => {
            const itemRow = document.createElement('div');
            itemRow.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #eee;";
            itemRow.innerHTML = `
                <div>
                    <strong>${cartItem.name}</strong> <span style="font-size: 12px; color: #777;">(Size: ${cartItem.size})</span>
                    ${cartItem.alterations !== 'None' ? `<br><span style="font-size: 11px; color: #d32f2f; font-weight: bold;">Alteration Request: ${cartItem.alterations}</span>` : ''}
                </div>
                <div style="display: flex; align-items: center; gap: 15px;">
                    <span style="font-weight: bold;">R${cartItem.price}</span>
                    <button class="remove-cart-item" data-index="${index}" style="background: #ffebee; color: #d32f2f; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">Remove</button>
                </div>
            `;
            cartItemsContainer.appendChild(itemRow);
        });

        const removeButtons = cartItemsContainer.querySelectorAll('.remove-cart-item');
        removeButtons.forEach(remBtn => {
            remBtn.onclick = (e) => {
                const idx = Number(remBtn.getAttribute('data-index'));
                cartState.total -= cartState.items[idx].price;
                cartState.items.splice(idx, 1);
                updateCartUI();
            };
        });
    }
}

const checkoutForm = document.getElementById('checkout-form');
if (checkoutForm) {
    checkoutForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (cartState.items.length === 0) {
            alert("Your cart is empty! Add items before checking out.");
            return;
        }

        const customerName = document.getElementById('checkout-customer-name').value.trim();
        const customerEmail = document.getElementById('checkout-customer-email').value.trim();
        const customerPhone = document.getElementById('checkout-customer-phone').value.trim();
        const deliveryAddress = document.getElementById('checkout-delivery-address').value.trim();

        const fullNameClean = formatCleanFullName(customerName);
        const nameParts = fullNameClean.split(' ');
        const firstName = nameParts[0] || '';
        const surname = nameParts.slice(1).join(' ') || '';

        try {
            const user = auth.currentUser;
            if (user) {
                const clientQuery = query(collection(db, "clients"), where("email", "==", user.email));
                const clientSnap = await getDocs(clientQuery);
                if (!clientSnap.empty) {
                    const clientDocRef = doc(db, "clients", clientSnap.docs[0].id);
                    await updateDoc(clientDocRef, { 
                        deliveryAddress: deliveryAddress,
                        phone: customerPhone 
                    });
                }
            }

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

            const itemSummary = cartState.items.map(i => `${i.name} [Size: ${i.size}] ${i.alterations !== 'None' ? '- Alteration Request: ' + i.alterations : ''}`).join('; ');

            await addDoc(collection(db, "orders"), {
                orderNumber: newOrderNumber,
                customer: fullNameClean,
                clientFirstName: firstName,
                clientSurname: surname,
                email: customerEmail,
                phone: customerPhone,
                deliveryAddress: deliveryAddress,
                orderDate: new Date().toISOString().split('T')[0],
                description: `Ready-Made Purchase: ${itemSummary}`,
                fabricType: 'Ready-Made Stock',
                threadType: 'None',
                accessoryType: 'None',
                amount: cartState.total,
                status: 'Processing',
                timestamp: new Date()
            });

            cartState.items = [];
            cartState.total = 0;
            updateCartUI();
            checkoutForm.reset();

            alert(`Checkout successful! Order reference (${newOrderNumber}) has been placed. Please upload your proof of payment via 'My Orders & Tracking'.`);
        } catch (error) {
            alert("Checkout failed: " + error.message);
        }
    });
}

function initAddressAutocomplete() {
    const addressInput = document.getElementById('checkout-delivery-address');
    if (!addressInput || typeof google === 'undefined' || !google.maps || !google.maps.places) return;

    const autocomplete = new google.maps.places.Autocomplete(addressInput, {
        types: ['address'],
        componentRestrictions: { country: ['za'] }
    });

    autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.formatted_address) {
            addressInput.value = place.formatted_address;
        }
    });
}

window.addEventListener('load', () => {
    setTimeout(initAddressAutocomplete, 1000);
});

loadStorefrontProducts();
updateCartUI();