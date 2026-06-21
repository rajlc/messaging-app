// Create and inject the Order Panel on Facebook/Messenger (Slides out to the left of the sidebar)
window.MarketplaceOrderModal = {
  isOpen: false,
  products: [],
  cities: [],
  ncmBranches: [],
  pickdropBranches: [],

  injectStyles() {
    if (document.getElementById('mkt-assistant-styles')) return;

    const style = document.createElement('style');
    style.id = 'mkt-assistant-styles';
    style.textContent = `
      .mkt-panel-container {
        position: fixed;
        right: 320px; /* immediately to the left of the 320px sidebar */
        top: 0;
        bottom: 0;
        width: 600px;
        background-color: #ffffff;
        color: #1e293b;
        border-left: 1px solid #cbd5e1;
        border-right: 1px solid #cbd5e1;
        box-shadow: -10px 0 30px rgba(0, 0, 0, 0.15);
        display: flex;
        flex-direction: column;
        overflow: hidden;
        z-index: 999998;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        animation: mktSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      }
      @keyframes mktSlideIn {
        from { transform: translateX(80px); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      .mkt-panel-header {
        padding: 16px 20px;
        border-bottom: 1px solid #f1f5f9;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background-color: #ffffff;
      }
      .mkt-panel-title {
        font-size: 16px;
        font-weight: 700;
        color: #1e293b;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .mkt-panel-close-btn {
        background: transparent;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        font-size: 20px;
        line-height: 1;
        padding: 4px 8px;
        border-radius: 6px;
      }
      .mkt-panel-close-btn:hover {
        background-color: #f1f5f9;
        color: #475569;
      }
      .mkt-panel-body {
        padding: 20px;
        overflow-y: auto;
        flex: 1;
        background-color: #f8fafc;
      }
      .mkt-form-row {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
        margin-bottom: 16px;
      }
      .mkt-form-group {
        display: flex;
        flex-direction: column;
      }
      .mkt-form-group.full {
        grid-column: span 2;
      }
      .mkt-form-label {
        font-size: 10px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #64748b;
        margin-bottom: 6px;
      }
      .mkt-form-label span.required {
        color: #ef4444;
        margin-left: 2px;
      }
      .mkt-input, .mkt-select {
        box-sizing: border-box;
        padding: 10px 14px;
        background-color: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        color: #1e293b;
        font-size: 13px;
        outline: none;
        transition: all 0.2s;
      }
      .mkt-input:focus, .mkt-select:focus {
        border-color: #6366f1;
        box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
      }
      .mkt-items-container {
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        padding: 16px;
        background-color: #ffffff;
        margin-bottom: 16px;
      }
      .mkt-item-row {
        display: grid;
        grid-template-columns: 3.5fr 1fr 1.5fr 0.5fr;
        gap: 8px;
        margin-bottom: 10px;
        align-items: center;
      }
      .mkt-add-item-btn {
        width: 100%;
        padding: 8px;
        background-color: #f8fafc;
        border: 1px dashed #cbd5e1;
        border-radius: 8px;
        color: #6366f1;
        font-size: 12px;
        font-weight: bold;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 4px;
      }
      .mkt-add-item-btn:hover {
        background-color: #f5f3ff;
        border-color: #6366f1;
      }
      .mkt-delete-item-btn {
        background: transparent;
        border: none;
        color: #ef4444;
        cursor: pointer;
        font-size: 20px;
        line-height: 1;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .mkt-delete-item-btn:hover {
        color: #b91c1c;
      }
      .mkt-panel-footer {
        padding: 16px 20px;
        border-top: 1px solid #e2e8f0;
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        background-color: #ffffff;
      }
      .mkt-btn {
        padding: 10px 20px;
        border-radius: 8px;
        font-weight: 700;
        font-size: 13px;
        cursor: pointer;
        border: none;
        transition: all 0.2s;
      }
      .mkt-btn-primary {
        background-color: #6366f1;
        color: #ffffff;
        box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.2);
      }
      .mkt-btn-primary:hover {
        background-color: #4f46e5;
      }
      .mkt-btn-secondary {
        background-color: #f1f5f9;
        color: #475569;
      }
      .mkt-btn-secondary:hover {
        background-color: #e2e8f0;
      }
    `;
    document.head.appendChild(style);
  },

  async open(customerName, customerId, profileId, profileName) {
    if (this.isOpen) {
      this.close();
    }
    this.injectStyles();

    // Check login state first
    const data = await chrome.storage.local.get(['token', 'backendUrl']);
    if (!data.token) {
      alert('Please log in through the Marketplace Assistant sidebar first to create orders.');
      return;
    }

    const backendUrl = data.backendUrl || 'http://localhost:3002';
    const token = data.token;

    this.isOpen = true;

    // Load data from backend
    try {
      this.products = await this.fetchBackend(backendUrl, '/api/orders/inventory-products', token) || [];
      this.cities = await this.fetchBackend(backendUrl, '/api/logistics/cities', token) || [];
      const ncmRes = await this.fetchBackend(backendUrl, '/api/logistics/ncm/branches', token);
      this.ncmBranches = ncmRes?.success ? ncmRes.data : [];
      const pdRes = await this.fetchBackend(backendUrl, '/api/logistics/pickdrop/branches', token);
      this.pickdropBranches = pdRes?.success ? pdRes.data : [];
    } catch (e) {
      console.error('Failed to prefetch order lists', e);
    }

    // Build the order panel (no blocking background, side-by-side)
    const panel = document.createElement('div');
    panel.className = 'mkt-panel-container';
    panel.id = 'mkt-order-panel';

    // Header
    const header = document.createElement('div');
    header.className = 'mkt-panel-header';
    header.innerHTML = `
      <h3 class="mkt-panel-title">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="margin-right:2px;"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
        Create New Order
      </h3>
      <button class="mkt-panel-close-btn" id="mkt-panel-close-x">&times;</button>
    `;
    panel.appendChild(header);

    // Body
    const body = document.createElement('div');
    body.className = 'mkt-panel-body';
    panel.appendChild(body);

    // Form inputs template (Hides Platform, Order Type, and Page Name fields)
    body.innerHTML = `
      <div class="mkt-form-row">
        <div class="mkt-form-group">
          <label class="mkt-form-label">Customer Name <span class="required">*</span></label>
          <input type="text" id="mkt-cust-name" class="mkt-input" value="${customerName || ''}" placeholder="Customer Name">
        </div>
        <div class="mkt-form-group">
          <label class="mkt-form-label">Phone Number <span class="required">*</span></label>
          <input type="text" id="mkt-cust-phone" class="mkt-input" placeholder="98XXXXXXXX">
        </div>
      </div>

      <div class="mkt-form-row">
        <div class="mkt-form-group">
          <label class="mkt-form-label">Alt. Phone</label>
          <input type="text" id="mkt-cust-altphone" class="mkt-input" placeholder="Optional Alt Phone">
        </div>
        <div class="mkt-form-group">
          <label class="mkt-form-label">Address</label>
          <input type="text" id="mkt-cust-addr" class="mkt-input" placeholder="Full delivery address">
        </div>
      </div>

      <div class="mkt-form-row">
        <div class="mkt-form-group">
          <label class="mkt-form-label">Courier Provider</label>
          <select id="mkt-courier" class="mkt-select">
            <option value="self">Self (No Shipping)</option>
            <option value="pathao">Pathao Parcel</option>
            <option value="ncm">Nepal Can Move (NCM)</option>
            <option value="pickdrop">Pick & Drop</option>
            <option value="local">Local Logistics</option>
          </select>
        </div>
        <div class="mkt-form-group">
          <label class="mkt-form-label">Delivery Branch / City</label>
          <select id="mkt-branch" class="mkt-select">
            <option value="">Select Branch/City...</option>
          </select>
        </div>
      </div>

      <div class="mkt-form-row">
        <div class="mkt-form-group">
          <label class="mkt-form-label">Delivery Charge (Paid by Customer)</label>
          <input type="number" id="mkt-del-charge" class="mkt-input" value="0">
        </div>
        <div class="mkt-form-group">
          <label class="mkt-form-label">Remarks</label>
          <input type="text" id="mkt-remarks" class="mkt-input" placeholder="Add any internal remarks here...">
        </div>
      </div>

      <div class="mkt-items-container">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <label class="mkt-form-label" style="margin-bottom:0;">Order Items <span class="required">*</span></label>
          <button type="button" class="mkt-btn mkt-btn-secondary" id="mkt-add-item-row" style="padding: 4px 10px; font-size:11px; border-radius:6px;">+ Add Item</button>
        </div>
        <div id="mkt-items-list"></div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; background: #ffffff; padding: 16px; border: 1px solid #e2e8f0; border-radius: 12px; margin-top: 16px;">
        <span style="font-size: 13px; font-weight: 700; color: #64748b;">DELIVERY CHARGE</span>
        <span id="mkt-del-charge-display" style="font-size: 15px; font-weight: bold; color: #1e293b;">Rs 0</span>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; background: #ffffff; padding: 16px; border: 1px solid #e2e8f0; border-radius: 12px; margin-top: 10px;">
        <span style="font-size: 13px; font-weight: 700; color: #64748b;">TOTAL AMOUNT</span>
        <span id="mkt-total-display" style="font-size: 20px; font-weight: 800; color: #10b981;">Rs 0</span>
      </div>
    `;

    // Footer
    const footer = document.createElement('div');
    footer.className = 'mkt-panel-footer';
    footer.innerHTML = `
      <button class="mkt-btn mkt-btn-secondary" id="mkt-panel-cancel">Cancel</button>
      <button class="mkt-btn mkt-btn-primary" id="mkt-panel-save">Confirm & Sync</button>
    `;
    panel.appendChild(footer);

    document.body.appendChild(panel);

    // Setup events
    document.getElementById('mkt-panel-close-x').onclick = () => this.close();
    document.getElementById('mkt-panel-cancel').onclick = () => this.close();
    document.getElementById('mkt-add-item-row').onclick = () => this.addItemRow();
    document.getElementById('mkt-courier').onchange = () => this.updateBranchOptions();
    document.getElementById('mkt-del-charge').oninput = () => {
      const val = parseFloat(document.getElementById('mkt-del-charge').value) || 0;
      document.getElementById('mkt-del-charge-display').textContent = 'Rs ' + val.toLocaleString();
      this.calculateTotal();
    };

    // Setup first item row
    this.addItemRow();

    // Populate branch options
    this.updateBranchOptions();

    // Scan messages for phone number to pre-populate it
    this.autoScrapePhone();

    // Handle Submit
    document.getElementById('mkt-panel-save').onclick = async () => {
      const name = document.getElementById('mkt-cust-name').value.trim();
      const phone = document.getElementById('mkt-cust-phone').value.trim();
      const altPhone = document.getElementById('mkt-cust-altphone').value.trim();
      const address = document.getElementById('mkt-cust-addr').value.trim();
      const courier = document.getElementById('mkt-courier').value;
      const branchSelect = document.getElementById('mkt-branch');
      const branchName = branchSelect.options[branchSelect.selectedIndex]?.text || '';
      const branchId = branchSelect.value;
      const delCharge = parseFloat(document.getElementById('mkt-del-charge').value || '0');
      const remarksText = document.getElementById('mkt-remarks').value.trim();

      if (!name) { alert('Customer Name is required'); return; }
      if (!phone || phone.length < 10) { alert('Valid 10-digit Phone Number is required'); return; }

      // Read items
      const itemRows = document.querySelectorAll('.mkt-item-row');
      const items = [];
      for (const row of itemRows) {
        const prodSelect = row.querySelector('.mkt-item-product');
        const qtyInput = row.querySelector('.mkt-item-qty');
        const priceInput = row.querySelector('.mkt-item-price');

        const productId = prodSelect.value;
        const productName = prodSelect.options[prodSelect.selectedIndex]?.text;
        const qty = parseInt(qtyInput.value) || 0;
        const amount = parseFloat(priceInput.value) || 0;

        if (!productId) {
          alert('Please select a product for all rows.');
          return;
        }
        if (qty <= 0) {
          alert('Quantity must be greater than 0.');
          return;
        }

        items.push({
          product_id: productId,
          product_name: productName,
          qty: qty,
          amount: amount,
          total_amount: qty * amount
        });
      }

      if (items.length === 0) {
        alert('Please add at least one item.');
        return;
      }

      // Calculate totals
      const itemsTotal = items.reduce((sum, item) => sum + item.total_amount, 0);
      const totalAmt = itemsTotal + delCharge;

      // Platform, Order type, and Page Name fields are hidden and auto-set:
      // Platform = "Facebook", Order type = "others", "Page Name" = Others
      const orderPayload = {
        customer_name: name,
        customer_id: customerId || 'manual',
        phone_number: phone,
        alt_phone: altPhone,
        address: address,
        platform: 'Facebook',
        page_name: 'Others',
        platform_account: profileId || 'manual_profile',
        order_status: 'New Order',
        delivery_charge: delCharge,
        total_amount: totalAmt,
        weight: 0.5,
        items: items,
        remarks: remarksText,
        courier_provider: courier,
        // Sync attributes
        order_date: new Date().toISOString().split('T')[0],
        order_number: `MKT-${Math.floor(1000 + Math.random() * 9000)}`,
        tracking_number: `TRK-${Date.now()}`,
        order_type: 'others',
        // Set courier detail
        city_id: courier === 'pathao' ? parseInt(branchId) : null,
        city_name: courier === 'pathao' ? branchName : null,
        delivery_branch: courier !== 'pathao' ? branchName : null,
        courier_delivery_fee: 0
      };

      const btnSave = document.getElementById('mkt-panel-save');
      btnSave.disabled = true;
      btnSave.textContent = 'Saving...';

      try {
        const res = await fetch(`${backendUrl}/api/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(orderPayload)
        });

        if (!res.ok) {
          throw new Error('Save API request failed with status ' + res.status);
        }

        alert('Order created successfully!');
        this.close();
      } catch (err) {
        alert('Failed to save order: ' + err.message);
      } finally {
        btnSave.disabled = false;
        btnSave.textContent = 'Confirm & Sync';
      }
    };
  },

  close() {
    const el = document.getElementById('mkt-order-panel');
    if (el) el.remove();
    this.isOpen = false;
  },

  addItemRow() {
    const list = document.getElementById('mkt-items-list');
    const row = document.createElement('div');
    row.className = 'mkt-item-row';

    // Populate products options
    let options = '<option value="">Select Product...</option>';
    this.products.forEach(p => {
      options += `<option value="${p.id || p.uuid || p.product_id}">${p.product_name}</option>`;
    });

    row.innerHTML = `
      <select class="mkt-select mkt-item-product" style="padding: 8px 10px;">${options}</select>
      <input type="number" class="mkt-input mkt-item-qty" value="1" min="1" style="padding: 8px 10px; text-align: center;">
      <input type="number" class="mkt-input mkt-item-price" value="0" min="0" style="padding: 8px 10px;">
      <button type="button" class="mkt-delete-item-btn">&times;</button>
    `;

    list.appendChild(row);

    // Hook events
    row.querySelector('.mkt-delete-item-btn').onclick = () => {
      if (document.querySelectorAll('.mkt-item-row').length > 1) {
        row.remove();
        this.calculateTotal();
      }
    };

    const prodSelect = row.querySelector('.mkt-item-product');
    prodSelect.onchange = () => {
      const selected = this.products.find(p => p.id === prodSelect.value || p.uuid === prodSelect.value || p.product_id === prodSelect.value);
      if (selected) {
        row.querySelector('.mkt-item-price').value = selected.price || selected.selling_price || 0;
      }
      this.calculateTotal();
    };

    row.querySelector('.mkt-item-qty').oninput = () => this.calculateTotal();
    row.querySelector('.mkt-item-price').oninput = () => this.calculateTotal();

    this.calculateTotal();
  },

  updateBranchOptions() {
    const courier = document.getElementById('mkt-courier').value;
    const branchSelect = document.getElementById('mkt-branch');
    branchSelect.innerHTML = '';

    if (courier === 'self') {
      branchSelect.innerHTML = '<option value="self">N/A (Self Pickup)</option>';
    } else if (courier === 'pathao') {
      let options = '<option value="">Select Pathao City...</option>';
      this.cities.forEach(c => {
        options += `<option value="${c.city_id}">${c.city_name}</option>`;
      });
      branchSelect.innerHTML = options;
    } else if (courier === 'ncm') {
      let options = '<option value="">Select NCM Branch...</option>';
      this.ncmBranches.forEach(b => {
        options += `<option value="${b.name || b.branch_name}">${b.name || b.branch_name}</option>`;
      });
      branchSelect.innerHTML = options;
    } else if (courier === 'pickdrop') {
      let options = '<option value="">Select PickDrop Branch...</option>';
      this.pickdropBranches.forEach(b => {
        options += `<option value="${b.name || b.branch_name}">${b.name || b.branch_name}</option>`;
      });
      branchSelect.innerHTML = options;
    } else {
      branchSelect.innerHTML = '<option value="local">Local Delivery</option>';
    }
  },

  calculateTotal() {
    const itemRows = document.querySelectorAll('.mkt-item-row');
    let total = 0;
    itemRows.forEach(row => {
      const qty = parseFloat(row.querySelector('.mkt-item-qty').value) || 0;
      const price = parseFloat(row.querySelector('.mkt-item-price').value) || 0;
      total += qty * price;
    });

    const delCharge = parseFloat(document.getElementById('mkt-del-charge').value) || 0;
    total += delCharge;

    document.getElementById('mkt-total-display').textContent = 'Rs ' + total.toLocaleString();
  },

  autoScrapePhone() {
    // Attempt to locate a 10-digit number from active message container elements
    const messageRows = document.querySelectorAll('div[role="row"], div[data-testid="message_grid"] div[dir="auto"]');
    const phoneRegex = /\b(9[78]\d{8}|\d{10})\b/;
    for (let i = messageRows.length - 1; i >= 0; i--) {
      const text = messageRows[i].textContent;
      const match = text?.match(phoneRegex);
      if (match) {
        const input = document.getElementById('mkt-cust-phone');
        if (input) {
          input.value = match[0];
          break;
        }
      }
    }
  },

  async fetchBackend(backendUrl, path, token) {
    const res = await fetch(`${backendUrl}${path}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) return await res.json();
    return null;
  }
};
