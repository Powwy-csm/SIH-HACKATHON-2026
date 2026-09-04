// Hackathon Demo Credentials Database
const mockCredentials = {
    student: {
        email: 'student@ssn.edu.in',
        password: 'password123',
        redirectUrl: 'student/index.html'
    },
    academician: {
        email: 'faculty@ssn.edu.in',
        password: 'password123',
        redirectUrl: 'institution/index.html'
    },
    industry: {
        email: 'hr@abctech.demo',
        password: 'password123',
        redirectUrl: 'industry/index.html'
    }
};

// Function to auto-fill the form when a judge clicks a demo role button
function fillDemo(role) {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorBox = document.getElementById('errorMessage');

    // Hide error box if it was showing
    errorBox.style.display = 'none';

    // Auto-fill values
    emailInput.value = mockCredentials[role].email;
    passwordInput.value = mockCredentials[role].password;

    // Small visual feedback animation
    emailInput.style.backgroundColor = '#EFF6FF';
    passwordInput.style.backgroundColor = '#EFF6FF';
    
    setTimeout(() => {
        emailInput.style.backgroundColor = '';
        passwordInput.style.backgroundColor = '';
    }, 300);
}

// Handle Form Submission
document.getElementById('loginForm').addEventListener('submit', function(e) {
    e.preventDefault(); // Stop page from refreshing

    const enteredEmail = document.getElementById('email').value.trim();
    const enteredPassword = document.getElementById('password').value;
    const errorBox = document.getElementById('errorMessage');

    let isAuthenticated = false;

    // Check entered email against our mock database
    for (const role in mockCredentials) {
        if (enteredEmail === mockCredentials[role].email && enteredPassword === mockCredentials[role].password) {
            
            isAuthenticated = true;
            
            // Optional: Change button text to show loading state
            const submitBtn = document.querySelector('.btn-submit');
            submitBtn.innerHTML = '<i class="ph ph-spinner-gap" style="animation: spin 1s linear infinite;"></i> Signing In...';
            
            // Redirect after a tiny delay for realism
            setTimeout(() => {
                window.location.href = mockCredentials[role].redirectUrl;
            }, 600);
            
            break;
        }
    }

    // If no match was found, show error
    if (!isAuthenticated) {
        errorBox.style.display = 'flex';
        // Shake animation for error
        errorBox.style.animation = 'shake 0.4s ease-in-out';
        setTimeout(() => {
            errorBox.style.animation = '';
        }, 400);
    }
});

// CSS for the spinner and shake animation injected via JS
const style = document.createElement('style');
style.textContent = `
    @keyframes spin { 100% { transform: rotate(360deg); } }
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);