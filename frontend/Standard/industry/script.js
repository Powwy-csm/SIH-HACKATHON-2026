document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Sidebar Mobile Toggle ---
    const sidebar = document.getElementById('sidebar');
    const mobileToggleBtn = document.getElementById('mobileToggleBtn');
    const mobileCloseBtn = document.getElementById('mobileCloseBtn');

    // --- 1.5 Tab Switching (Overview <-> Company Profile) ---
    const dashboardTabs = document.querySelectorAll('.dashboard-tab');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const navDashboard = document.getElementById('navDashboard');
    const navCompanyProfile = document.getElementById('navCompanyProfile');
    const manageProfileBtn = document.getElementById('manageProfileBtn');
    const pageTitle = document.querySelector('.page-title');

    function switchTab(targetId) {
        dashboardTabs.forEach(item => {
            const isMatch = item.dataset.tabTarget === targetId;
            item.classList.toggle('active', isMatch);
            item.setAttribute('aria-selected', isMatch ? 'true' : 'false');
        });

        tabPanels.forEach(panel => {
            const isMatch = panel.id === targetId;
            panel.classList.toggle('active', isMatch);
            panel.hidden = !isMatch;
            panel.style.display = isMatch ? 'block' : 'none';
        });

        if (navDashboard && navCompanyProfile) {
            if (targetId === 'profilePanel') {
                navDashboard.classList.remove('active');
                navCompanyProfile.classList.add('active');
                if (pageTitle) pageTitle.textContent = 'Company Profile';
            } else {
                navCompanyProfile.classList.remove('active');
                navDashboard.classList.add('active');
                if (pageTitle) pageTitle.textContent = 'Dashboard';
            }
        }

        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    dashboardTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            if (tab.dataset.tabTarget) switchTab(tab.dataset.tabTarget);
        });
    });

    if (navCompanyProfile) {
        navCompanyProfile.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab('profilePanel');
        });
    }

    if (navDashboard) {
        navDashboard.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab('overviewPanel');
        });
    }

    if (manageProfileBtn) {
        manageProfileBtn.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab('profilePanel');
        });
    }

    const topbarProfile = document.querySelector('.profile-dropdown');
    if (topbarProfile) {
        topbarProfile.addEventListener('click', () => {
            switchTab('profilePanel');
        });
    }

    const sidebarMiniProfile = document.querySelector('.company-mini-profile');
    if (sidebarMiniProfile) {
        sidebarMiniProfile.style.cursor = 'pointer';
        sidebarMiniProfile.addEventListener('click', () => {
            switchTab('profilePanel');
        });
    }

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
            if(modal){
                modal.style.display = 'none';
            }
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
                        backgroundColor: 'rgba(148, 163, 184, 0.08)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        pointHoverBorderWidth: 3,
                        pointHoverBackgroundColor: '#FFFFFF'
                    },
                    {
                        label: 'Shortlisted',
                        data: [20, 25, 30, 45, 55, 80],
                        borderColor: '#2563EB', // Accent Blue
                        backgroundColor: 'rgba(37, 99, 235, 0.08)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        pointHoverBorderWidth: 3,
                        pointHoverBackgroundColor: '#FFFFFF'
                    },
                    {
                        label: 'Interviewed',
                        data: [15, 18, 22, 35, 40, 50],
                        borderColor: '#F59E0B', // Warning Yellow
                        backgroundColor: 'rgba(245, 158, 11, 0.06)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        pointHoverBorderWidth: 3,
                        pointHoverBackgroundColor: '#FFFFFF'
                    },
                    {
                        label: 'Selected',
                        data: [5, 8, 12, 18, 24, 31],
                        borderColor: '#16A34A', // Success Green
                        backgroundColor: 'rgba(22, 163, 74, 0.08)',
                        fill: true,
                        tension: 0.4,
                        borderWidth: 3,
                        pointRadius: 0,
                        pointHoverRadius: 6,
                        pointHoverBorderWidth: 3,
                        pointHoverBackgroundColor: '#FFFFFF'
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
                            pointStyle: 'circle',
                            boxWidth: 8,
                            padding: 20,
                            font: {
                                family: "'Inter', sans-serif",
                                size: 12,
                                weight: '500'
                            }
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: '#091527',
                        titleFont: { family: "'Inter', sans-serif", size: 13, weight: '700' },
                        bodyFont: { family: "'Inter', sans-serif", size: 12 },
                        padding: 12,
                        cornerRadius: 8,
                        boxPadding: 4
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
                                family: "'Inter', sans-serif",
                                size: 12
                            },
                            color: '#64748B'
                        }
                    },
                    y: {
                        grid: {
                            color: '#F1F5F9',
                            drawBorder: false
                        },
                        ticks: {
                            font: {
                                family: "'Inter', sans-serif",
                                size: 12
                            },
                            color: '#64748B',
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
