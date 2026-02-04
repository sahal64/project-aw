document.addEventListener('DOMContentLoaded', function () {
    // Mock Data
    const transactions = [
        { id: '#TRX-987654321', orderId: '#ORD-001', date: '2025-10-24', amount: 169.99, method: 'Visa **** 4242', status: 'Success' },
        { id: '#TRX-123456789', orderId: '#ORD-002', date: '2025-11-01', amount: 350.50, method: 'PayPal', status: 'Pending' },
        { id: '#TRX-456789123', orderId: '#ORD-003', date: '2025-11-02', amount: 75.00, method: 'MasterCard **** 8888', status: 'Success' },
        { id: '#TRX-789123456', orderId: '#ORD-004', date: '2025-11-03', amount: 120.00, method: 'Visa **** 1234', status: 'Failed' },
        { id: '#TRX-321654987', orderId: '#ORD-005', date: '2025-11-05', amount: 210.25, method: 'PayPal', status: 'Success' },
        { id: '#TRX-654987321', orderId: '#ORD-006', date: '2025-11-07', amount: 89.99, method: 'Visa **** 5678', status: 'Success' },
        { id: '#TRX-147258369', orderId: '#ORD-007', date: '2025-11-10', amount: 450.00, method: 'MasterCard **** 9999', status: 'Pending' },
        { id: '#TRX-369258147', orderId: '#ORD-008', date: '2025-11-12', amount: 25.50, method: 'PayPal', status: 'Success' },
        { id: '#TRX-258369147', orderId: '#ORD-009', date: '2025-11-15', amount: 199.99, method: 'Visa **** 0000', status: 'Success' },
        { id: '#TRX-951753852', orderId: '#ORD-010', date: '2025-11-18', amount: 299.00, method: 'MasterCard **** 1111', status: 'Failed' },
    ];

    const tableBody = document.querySelector('tbody');
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    const filterBtn = document.getElementById('filterBtn');
    const resetBtn = document.getElementById('resetBtn');
    const downloadCsvBtn = document.getElementById('downloadCsv');
    const downloadPdfBtn = document.getElementById('downloadPdf');

    // Helper to format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
    };

    // Helper to format date for display
    const formatDate = (dateString) => {
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        return new Date(dateString).toLocaleDateString('en-US', options);
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
            if (trx.status === 'Success') badgeClass = 'bg-success';
            else if (trx.status === 'Pending') badgeClass = 'bg-warning text-dark';
            else if (trx.status === 'Failed') badgeClass = 'bg-danger';

            let icon = '';
            if (trx.method.includes('Visa') || trx.method.includes('MasterCard')) icon = '<i class="bi bi-credit-card"></i>';
            else if (trx.method.includes('PayPal')) icon = '<i class="bi bi-paypal"></i>';

            const row = `
                <tr>
                    <td class="text-muted">${trx.id}</td>
                    <td><a href="#" class="text-dark">${trx.orderId}</a></td>
                    <td>${formatDate(trx.date)}</td>
                    <td class="fw-bold">${formatCurrency(trx.amount)}</td>
                    <td>${icon} ${trx.method}</td>
                    <td><span class="badge ${badgeClass}">${trx.status}</span></td>
                </tr>
            `;
            tableBody.innerHTML += row;
        });
    };

    // Filter Logic
    const filterTransactions = () => {
        const start = startDateInput.value ? new Date(startDateInput.value) : null;
        const end = endDateInput.value ? new Date(endDateInput.value) : null;

        const filtered = transactions.filter(trx => {
            const trxDate = new Date(trx.date);
            if (start && trxDate < start) return false;
            // Set end date to end of day to include transactions on that day
            if (end) {
                const endOfDay = new Date(end);
                endOfDay.setHours(23, 59, 59, 999);
                if (trxDate > endOfDay) return false;
            }
            return true;
        });

        renderTable(filtered);
    };

    // Event Listeners
    filterBtn.addEventListener('click', filterTransactions);

    resetBtn.addEventListener('click', () => {
        startDateInput.value = '';
        endDateInput.value = '';
        renderTable(transactions);
    });

    // CSV Download
    downloadCsvBtn.addEventListener('click', () => {
        // Get current displayed data (filtered)
        // For simplicity, we can re-run filter logic or just use global filtered state if we maintained it. 
        // Let's just re-filter to be safe or use all data if no filter. 
        // Actually, let's grab the data from the DOM or better yet, re-apply filter to source of truth.

        let dataToExport = transactions;
        const start = startDateInput.value ? new Date(startDateInput.value) : null;
        const end = endDateInput.value ? new Date(endDateInput.value) : null;

        if (start || end) {
            dataToExport = transactions.filter(trx => {
                const trxDate = new Date(trx.date);
                if (start && trxDate < start) return false;
                if (end) {
                    const endOfDay = new Date(end);
                    endOfDay.setHours(23, 59, 59, 999);
                    if (trxDate > endOfDay) return false;
                }
                return true;
            });
        }

        const csvContent = [
            ['Transaction ID', 'Order ID', 'Date', 'Amount', 'Payment Method', 'Status'],
            ...dataToExport.map(t => [t.id, t.orderId, t.date, t.amount, t.method, t.status])
        ].map(e => e.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "sales_report.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // PDF Download
    downloadPdfBtn.addEventListener('click', () => {
        let dataToExport = transactions;
        const start = startDateInput.value ? new Date(startDateInput.value) : null;
        const end = endDateInput.value ? new Date(endDateInput.value) : null;

        if (start || end) {
            dataToExport = transactions.filter(trx => {
                const trxDate = new Date(trx.date);
                if (start && trxDate < start) return false;
                if (end) {
                    const endOfDay = new Date(end);
                    endOfDay.setHours(23, 59, 59, 999);
                    if (trxDate > endOfDay) return false;
                }
                return true;
            });
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFontSize(18);
        doc.text("Sales Report", 14, 22);

        doc.setFontSize(11);
        const dateStr = `Date: ${new Date().toLocaleDateString()}`;
        doc.text(dateStr, 14, 30);

        if (start || end) {
            const rangeStr = `Range: ${startDateInput.value || 'Start'} to ${endDateInput.value || 'End'}`;
            doc.text(rangeStr, 14, 36);
        }

        const tableColumn = ["Transaction ID", "Order ID", "Date", "Amount", "Method", "Status"];
        const tableRows = [];

        dataToExport.forEach(trx => {
            const trxData = [
                trx.id,
                trx.orderId,
                trx.date,
                formatCurrency(trx.amount),
                trx.method,
                trx.status
            ];
            tableRows.push(trxData);
        });

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 40,
        });

        doc.save("sales_report.pdf");
    });

    // Initial Render
    renderTable(transactions);
});
