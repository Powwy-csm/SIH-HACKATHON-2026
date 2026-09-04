document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Mobile Sidebar Toggle ---
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

    // --- 2. Single Page Tab Navigation Logic ---
    const navItems = document.querySelectorAll('.nav-item[data-target]');
    const viewSections = document.querySelectorAll('.view-section');
    const topbarTitle = document.getElementById('topbarTitle');

    function navigateToView(targetKey) {
        // Remove active class from all nav items
        document.querySelectorAll('.nav-item').forEach(nav => {
            const isMatch = nav.getAttribute('data-target') === targetKey;
            nav.classList.toggle('active', isMatch);
            if (isMatch && topbarTitle) {
                topbarTitle.innerText = nav.innerText.trim();
            }
        });

        // Hide all views
        viewSections.forEach(section => {
            section.style.display = 'none';
            section.classList.remove('active');
        });

        // Show target view
        const targetId = 'view-' + targetKey;
        const targetView = document.getElementById(targetId);
        if (targetView) {
            targetView.style.display = 'block';
            setTimeout(() => targetView.classList.add('active'), 10);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        // Close mobile sidebar if open
        if (sidebar && window.innerWidth <= 768) {
            sidebar.classList.remove('show');
        }
    }

    navItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            const target = this.getAttribute('data-target');
            if (target) navigateToView(target);
        });
    });

    // Quick Action button shortcuts
    const shortcuts = [
        { id: 'btnExploreStudents', target: 'students' },
        { id: 'btnExploreDemand', target: 'demand' },
        { id: 'btnViewAllOpp', target: 'opportunities' },
        { id: 'btnViewAllFaculty', target: 'faculty' },
        { id: 'btnApplyFaculty', target: 'faculty' },
        { id: 'btnViewPlacementReport', target: 'placements' },
        { id: 'sidebarUserProfile', target: 'profile' },
        { id: 'topbarInstitutionProfile', target: 'profile' }
    ];

    shortcuts.forEach(({ id, target }) => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('click', (e) => {
                e.preventDefault();
                navigateToView(target);
            });
        }
    });

    // --- 3. Student Search & Multi-Filtering ---
    const searchInput = document.getElementById('studentSearchInput');
    const deptFilter = document.getElementById('filterDept');
    const yearFilter = document.getElementById('filterYear');
    const statusFilter = document.getElementById('filterStatus');
    const tableBody = document.getElementById('studentTableBody');

    function filterStudents() {
        if (!tableBody) return;
        const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const dept = deptFilter ? deptFilter.value : 'All Departments';
        const year = yearFilter ? yearFilter.value : 'All Years';
        const status = statusFilter ? statusFilter.value : 'All Readiness Status';

        const rows = tableBody.querySelectorAll('tr');
        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            
            // Isolate the specific cell for Department & Year
            const deptCell = row.querySelector('td:nth-child(2)');
            const rowDept = deptCell ? deptCell.innerText : '';
            
            // Filter logic matches
            const matchesQuery = !query || text.includes(query);
            const matchesDept = (dept === 'All Departments') || rowDept.toUpperCase().includes(dept.toUpperCase());
            const matchesYear = (year === 'All Years') || rowDept.includes(year);
            
            // Mocking status logic based on percentage values present in the row
            let matchesStatus = true;
            if (status === 'Placement Ready') matchesStatus = text.includes('9') || text.includes('8');
            if (status === 'Needs Upskilling') matchesStatus = text.includes('7') || text.includes('6');

            // Apply intersection of all active filters
            row.style.display = (matchesQuery && matchesDept && matchesYear && matchesStatus) ? '' : 'none';
        });
    }

    // Bind listeners to ALL filter inputs
    if (searchInput) searchInput.addEventListener('input', filterStudents);
    if (deptFilter) deptFilter.addEventListener('change', filterStudents);
    if (yearFilter) yearFilter.addEventListener('change', filterStudents);
    if (statusFilter) statusFilter.addEventListener('change', filterStudents);

    // --- 4. Chart.js Configurations ---
    const chartColors = {
        primary: '#1D4ED8',
        accent: '#2563EB',
        slate: '#94A3B8',
        border: '#E2E8F0',
        success: '#16A34A',
        warning: '#F59E0B'
    };

    // A. Student Skill Readiness (Horizontal Bar Chart)
    const readinessCtx = document.getElementById('readinessChart');
    if (readinessCtx) {
        new Chart(readinessCtx, {
            type: 'bar',
            data: {
                labels: ['Python & Scripting', 'Java / OOP', 'SQL & Databases', 'Data Analytics', 'AI / ML', 'Cloud / AWS'],
                datasets: [{
                    label: 'Student Proficiency %',
                    data: [82, 76, 74, 64, 59, 48],
                    backgroundColor: [
                        chartColors.accent,
                        chartColors.accent,
                        chartColors.accent,
                        chartColors.accent,
                        chartColors.accent,
                        chartColors.warning // Highlight cloud as low/gap
                    ],
                    borderRadius: 6,
                    barThickness: 18
                }]
            },
            options: {
                indexAxis: 'y',
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#0F172A',
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: { family: "'Inter', sans-serif", size: 13, weight: '700' },
                        bodyFont: { family: "'Inter', sans-serif", size: 12 },
                        callbacks: {
                            label: function(context) {
                                return ` ${context.parsed.x}% Class Proficiency Index`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        max: 100,
                        grid: { color: chartColors.border, drawBorder: false },
                        ticks: { font: { family: "'Inter', sans-serif", size: 11 } }
                    },
                    y: {
                        grid: { display: false, drawBorder: false },
                        ticks: { font: { family: "'Inter', sans-serif", weight: '600', size: 12 } }
                    }
                }
            }
        });
    }

    // B. Placement & Internship Progress (Funnel Chart)
    const placementCtx = document.getElementById('placementChart');
    if (placementCtx) {
        new Chart(placementCtx, {
            type: 'bar',
            data: {
                labels: ['Total Monitored', 'Internships Enrolled', 'Shortlisted', 'Placed / Selected'],
                datasets: [{
                    label: 'Students',
                    data: [486, 312, 148, 52],
                    backgroundColor: [
                        chartColors.slate,
                        chartColors.primary,
                        chartColors.accent,
                        chartColors.success
                    ],
                    borderRadius: 8,
                    barThickness: 42
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#0F172A',
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: { family: "'Inter', sans-serif", weight: '700' },
                        bodyFont: { family: "'Inter', sans-serif" },
                        callbacks: {
                            label: function(context) {
                                return ` ${context.parsed.y} Candidates`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false, drawBorder: false },
                        ticks: { font: { family: "'Inter', sans-serif", weight: '600', size: 12 } }
                    },
                    y: {
                        grid: { color: chartColors.border, drawBorder: false },
                        ticks: { font: { family: "'Inter', sans-serif", size: 11 } }
                    }
                }
            }
        });
    }
});

// --- Global Modal Handlers for Student Portfolio ---
// REPLACE openPortfolioModal with this:
function openPortfolioModal(studentName, dept, score) {
    const modal = document.getElementById('portfolioModal');
    const nameEl = document.getElementById('modalStudentName');
    const deptEl = document.getElementById('modalStudentDept');
    
    // Removed the masking fallbacks. It will now show exactly what you pass it.
    if (nameEl) nameEl.innerText = studentName;
    if (deptEl) deptEl.innerText = `${dept} • ${score} Readiness Score`;
    
    if (modal) modal.style.display = 'flex';
}

function closePortfolioModal() {
    const modal = document.getElementById('portfolioModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function toggleEndorse(btn) {
    const isEndorsed = btn.classList.contains('bg-success');
    
    if (isEndorsed) {
        // Revert to default state
        btn.classList.remove('bg-success');
        btn.classList.add('btn-primary');
        btn.innerHTML = '<i class="ph ph-thumbs-up"></i> Endorse for Placement';
    } else {
        // Change to endorsed state
        btn.classList.remove('btn-primary');
        btn.classList.add('bg-success');
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.innerHTML = '<i class="ph-fill ph-check-circle"></i> Endorsed';
    }
}

// Close modal on click outside
window.addEventListener('click', (e) => {
    const modal = document.getElementById('portfolioModal');
    if (modal && e.target === modal) {
        modal.style.display = 'none';
    }
});