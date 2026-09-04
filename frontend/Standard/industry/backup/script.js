document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Sidebar Mobile Toggle ---
    const sidebar = document.getElementById('sidebar');
    const mobileToggleBtn = document.getElementById('mobileToggleBtn');
    const mobileCloseBtn = document.getElementById('mobileCloseBtn');

    if (mobileToggleBtn && sidebar) {
        mobileToggleBtn.addEventListener('click', () => {
            sidebar.classList.add('show');
        });
    }

    if (mobileCloseBtn && sidebar) {
        mobileCloseBtn.addEventListener('click', () => {
            sidebar.classList.remove('show');
        });
    }

    // --- 1.5 Dashboard Tabs ---
    const dashboardTabs = document.querySelectorAll('.dashboard-tab');
    const tabPanels = document.querySelectorAll('.tab-panel');

    dashboardTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetId = tab.dataset.tabTarget;

            dashboardTabs.forEach(item => {
                item.classList.remove('active');
                item.setAttribute('aria-selected', 'false');
            });

            tabPanels.forEach(panel => {
                panel.classList.remove('active');
                panel.hidden = true;
            });

            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');

            const targetPanel = document.getElementById(targetId);
            if (targetPanel) {
                targetPanel.classList.add('active');
                targetPanel.hidden = false;
            }
        });
    });

    // --- 2. Shortlist Button Interaction ---
    const shortlistBtns = document.querySelectorAll('.btn-shortlist');
    
    shortlistBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            if (this.classList.contains('shortlisted')) {
                // Revert to default
                this.classList.remove('shortlisted');
                this.innerHTML = 'Shortlist';
            } else {
                // Change to shortlisted state
                this.classList.add('shortlisted');
                this.innerHTML = 'Shortlisted <i class="ph ph-check"></i>';
            }
        });
    });

    // --- 3. Post Opportunity Modal Logic ---
    const modal = document.getElementById('postModalOverlay');
    const openBtn = document.getElementById('openPostModalBtn');
    const closeBtns = document.querySelectorAll('.close-modal');

    if (openBtn && modal) {
        openBtn.addEventListener('click', () => {
            modal.style.display = 'flex';
        });
    }

    closeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault(); // Prevent form submission if it's a button inside form
            modal.style.display = 'none';
        });
    });

    // Close modal on clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });

    // Prevent modal close when clicking inside the container
    const modalContainer = document.querySelector('.modal-container');
    if (modalContainer) {
        modalContainer.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    // --- 4. Chart.js Initialization ---
    const ctx = document.getElementById('applicationsChart');
    
    if (ctx) {
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
                datasets: [
                    {
                        label: 'Applied',
                        data: [65, 78, 90, 115, 140, 248],
                        borderColor: '#94A3B8',
                        backgroundColor: '#94A3B8',
                        tension: 0.4,
                        borderWidth: 2
                    },
                    {
                        label: 'Shortlisted',
                        data: [20, 25, 30, 45, 55, 80],
                        borderColor: '#2563EB', // Accent Blue
                        backgroundColor: '#2563EB',
                        tension: 0.4,
                        borderWidth: 2
                    },
                    {
                        label: 'Interviewed',
                        data: [15, 18, 22, 35, 40, 50],
                        borderColor: '#F59E0B', // Warning Yellow
                        backgroundColor: '#F59E0B',
                        tension: 0.4,
                        borderWidth: 2
                    },
                    {
                        label: 'Selected',
                        data: [5, 8, 12, 18, 24, 31],
                        borderColor: '#16A34A', // Success Green
                        backgroundColor: '#16A34A',
                        tension: 0.4,
                        borderWidth: 2
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            boxWidth: 8,
                            font: {
                                family: "'Inter', sans-serif",
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: '#0B1F3A',
                        titleFont: { family: "'Inter', sans-serif" },
                        bodyFont: { family: "'Inter', sans-serif" },
                        padding: 10,
                        cornerRadius: 6
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false,
                            drawBorder: false
                        },
                        ticks: {
                            font: {
                                family: "'Inter', sans-serif"
                            }
                        }
                    },
                    y: {
                        grid: {
                            color: '#E2E8F0',
                            drawBorder: false,
                            borderDash: [5, 5]
                        },
                        ticks: {
                            font: {
                                family: "'Inter', sans-serif"
                            },
                            stepSize: 50
                        }
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                }
            }
        });
    }
});
