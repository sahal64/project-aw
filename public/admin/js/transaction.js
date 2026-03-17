document.addEventListener('DOMContentLoaded', function () {
    let transactions = [];

    const tableBody = document.querySelector('tbody');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const methodFilter = document.getElementById('methodFilter');
    const statusFilter = document.getElementById('statusFilter');
    const filterBtn = document.getElementById('filterBtn');
    const resetBtn = document.getElementById('resetBtn');
    const downloadCsvBtn = document.getElementById('downloadCsv');
    const downloadPdfBtn = document.getElementById('downloadPdf');

    // Modal elements
    const transactionModal = new bootstrap.Modal(document.getElementById('transactionModal'));
    const modalLoading = document.getElementById('modalLoading');
    const modalContent = document.getElementById('modalContent');

    // Helper to format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
    };

    // Helper to format date for display
    const formatDate = (dateString, showTime = false) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        if (showTime) {
            options.hour = '2-digit';
            options.minute = '2-digit';
        }
        return new Date(dateString).toLocaleDateString('en-IN', options);
    };

    // Fetch transactions from API
    const fetchTransactions = async (startDate = '', endDate = '', method = '', status = '') => {
        try {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4">Loading transactions...</td></tr>';

            let url = '/api/admin/transactions';
            const params = new URLSearchParams();
            if (startDate) params.append('startDate', startDate);
            if (endDate) params.append('endDate', endDate);
            if (method && method !== 'All Methods') params.append('method', method);
            if (status && status !== 'All') params.append('status', status);

            if (params.toString()) {
                url += `?${params.toString()}`;
            }

            const res = await fetch(url, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch transactions');

            transactions = await res.json();
            renderTable(transactions);
        } catch (err) {
            console.error(err);
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-danger">Error loading transactions</td></tr>';
        }
    };

    // Render Table
    const renderTable = (data) => {
        tableBody.innerHTML = '';
        if (data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4">No transactions found</td></tr>';
            return;
        }

        data.forEach(trx => {
            let badgeClass = 'bg-secondary';
            if (trx.status === 'Paid') badgeClass = 'bg-success';
            else if (trx.status === 'Refunded') badgeClass = 'bg-info';

            let icon = '<i class="bi bi-wallet2"></i>';
            if (trx.paymentMethod === 'Razorpay') icon = '<i class="bi bi-credit-card"></i>';
            else if (trx.paymentMethod === 'COD') icon = '<i class="bi bi-cash"></i>';
            else if (trx.paymentMethod === 'Wallet') icon = '<i class="bi bi-wallet2"></i>';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="text-muted small">${trx.transactionId}</td>
                <td><span class="text-dark fw-medium">${trx.orderId}</span></td>
                <td>${formatDate(trx.date)}</td>
                <td class="fw-bold">${formatCurrency(trx.amount)}</td>
                <td>${icon} ${trx.paymentMethod}</td>
                <td><span class="badge ${badgeClass}">${trx.status}</span></td>
            `;

            tr.addEventListener('click', () => showTransactionDetails(trx.orderMongoId, trx.transactionId));
            tableBody.appendChild(tr);
        });
    };

    // Show Transaction Details
    const showTransactionDetails = async (orderId, transactionId) => {
        transactionModal.show();
        modalLoading.style.display = 'block';
        modalContent.style.display = 'none';

        try {
            const res = await fetch(`/api/admin/orders/${orderId}`, { credentials: 'include' });
            if (!res.ok) throw new Error('Failed to fetch order details');
            const order = await res.json();

            // Populate Modal
            document.getElementById('det-transactionId').innerText = transactionId;
            document.getElementById('det-orderId').innerText = order.orderNumber;
            document.getElementById('det-customer').innerText = order.user?.name || 'N/A';
            document.getElementById('det-date').innerText = formatDate(order.createdAt, true);
            document.getElementById('det-method').innerText = order.paymentMethod;
            document.getElementById('det-amount').innerText = formatCurrency(order.totalAmount);

            const statusBadge = document.getElementById('det-status');
            statusBadge.innerText = order.paymentStatus;
            statusBadge.className = 'badge ' + (order.paymentStatus === 'Paid' ? 'bg-success' : 'bg-info');

            // Populate Products
            const productList = document.getElementById('det-products');
            productList.innerHTML = '';
            order.items.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'list-group-item d-flex justify-content-between align-items-center py-3';
                itemDiv.innerHTML = `
                    <div class="d-flex align-items-center">
                        <img src="${item.product?.images?.[0] || 'https://placehold.co/40'}" class="rounded me-3" style="width: 40px; height: 40px; object-fit: cover;">
                        <div>
                            <h6 class="mb-0 fw-bold">${item.product?.name || 'Unknown Product'}</h6>
                            <small class="text-muted">Qty: ${item.quantity} × ${formatCurrency(item.price)}</small>
                        </div>
                    </div>
                `;
                productList.appendChild(itemDiv);
            });

            modalLoading.style.display = 'none';
            modalContent.style.display = 'block';
        } catch (err) {
            console.error(err);
            modalLoading.innerHTML = '<p class="text-danger">Error loading details</p>';
        }
    };

    // Filter Logic
    const filterTransactions = () => {
        fetchTransactions(
            startDateInput.value,
            endDateInput.value,
            methodFilter.value,
            statusFilter.value
        );
    };

    // Event Listeners
    filterBtn.addEventListener('click', filterTransactions);

    resetBtn.addEventListener('click', () => {
        startDateInput.value = '';
        endDateInput.value = '';
        methodFilter.value = 'All Methods';
        statusFilter.value = 'All';
        fetchTransactions();
    });

    downloadCsvBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (transactions.length === 0) {
            return Swal.fire({
                icon: "warning",
                title: "No Data",
                text: "No data to export",
                confirmButtonColor: "#f59e0b"
            });
        }

        const headers = ['Transaction ID', 'Order ID', 'Date', 'Amount', 'Payment Method', 'Status'];
        const rows = transactions.map(t => [
            t.transactionId,
            t.orderId,
            new Date(t.date).toLocaleDateString(),
            t.amount,
            t.paymentMethod,
            t.status
        ]);

        const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `transactions_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // PDF Download
    downloadPdfBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (transactions.length === 0) {
            return Swal.fire({
                icon: "warning",
                title: "No Data",
                text: "No data to export",
                confirmButtonColor: "#f59e0b"
            });
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text("AeroWatch Transactions Report", 14, 22);

        doc.setFontSize(11);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

        const rangeStr = `Filters: ${statusFilter.value} | ${methodFilter.value} | ${startDateInput.value || 'Start'} to ${endDateInput.value || 'End'}`;
        doc.text(rangeStr, 14, 36);

        const tableColumn = ["Transaction ID", "Order ID", "Date", "Amount", "Method", "Status"];
        const tableRows = transactions.map(trx => [
            trx.transactionId,
            trx.orderId,
            new Date(trx.date).toLocaleDateString(),
            formatCurrency(trx.amount),
            trx.paymentMethod,
            trx.status
        ]);

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [0, 0, 0] }
        });

        doc.save(`transactions_${new Date().toISOString().split('T')[0]}.pdf`);
    });

    // Expose for global use
    window.fetchTransactions = fetchTransactions;
});
