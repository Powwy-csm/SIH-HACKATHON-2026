// A simple routing function for the Single Page Application feel
function switchView(targetId) {
    if (!targetId) return; // guard against clicks on nav items with no data-target

    document.querySelectorAll('.view-section').forEach(section => {
        section.style.display = 'none';
        section.classList.remove('active');
    });
    const targetView = document.getElementById('view-' + targetId);
    if (targetView) {
        targetView.style.display = 'block';
        setTimeout(() => targetView.classList.add('active'), 10);
    }
    // 3. Update Sidebar Active State
    document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.remove('active');
        if (nav.getAttribute('data-target') === targetId) {
            nav.classList.add('active');
        }
    });

    // 4. Scroll to top
    document.querySelector('.main-content').scrollTo(0, 0);
}

document.addEventListener('DOMContentLoaded', () => {
    
    // --- Mobile Sidebar Toggle ---
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

    // --- Tab Navigation Setup ---
    const navItems = document.querySelectorAll('.nav-item[data-target]');
    // NEW
navItems.forEach(item => {
    item.addEventListener('click', function(e) {
        e.preventDefault();
        const target = this.getAttribute('data-target');
        switchView(target);
        
        if (sidebar && window.innerWidth <= 768) {
            sidebar.classList.remove('show');
        }
    });
});

    // Allow clicking on Assessment radio buttons to trigger visual selection
    // (CSS :has() handles the styling, this just prevents default form submission issues if any)
    const radioInputs = document.querySelectorAll('.option-item input[type="radio"]');
    radioInputs.forEach(input => {
        input.addEventListener('change', (e) => {
            console.log("Selected option:", e.target.value);
        });
    });
});