// ========================================
// CYBER ELITE - MAIN JAVASCRIPT
// ========================================

document.addEventListener('DOMContentLoaded', function() {
    
    // ========================================
    // NAVIGATION
    // ========================================
    const navbar = document.querySelector('.navbar');
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    
    // Scroll effect for navbar
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
    
    // Mobile menu toggle
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }
    
    // Close mobile menu on link click
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
        });
    });
    
    // ========================================
    // MODAL SYSTEM
    // ========================================
    const modalOverlays = document.querySelectorAll('.modal-overlay');
    const syllabusButtons = document.querySelectorAll('[data-syllabus]');
    
    // Open syllabus modal
    syllabusButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const courseName = btn.getAttribute('data-syllabus');
            openSyllabusModal(courseName);
        });
    });
    
    function openSyllabusModal(courseName) {
        const modal = document.getElementById('syllabusModal');
        if (modal) {
            modal.classList.add('active');
            document.getElementById('syllabusCourseName').value = courseName;
        }
    }
    
    // Close modal
    modalOverlays.forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay || e.target.classList.contains('modal-close')) {
                overlay.classList.remove('active');
            }
        });
    });
    
// ========================================
// SYLLABUS DOWNLOAD FORM - BACKEND INTEGRATION
// ========================================
const syllabusForm = document.getElementById('syllabusForm');

if (syllabusForm) {
    syllabusForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Client-side validation
        const name = document.getElementById('syllabusName').value.trim();
        const email = document.getElementById('syllabusEmail').value.trim();
        const phone = document.getElementById('syllabusPhone').value.trim();
        
        if (!name || !email || !phone) {
            alert('Please fill in all required fields.');
            return;
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Please enter a valid email address.');
            return;
        }
        
        // Submit to backend and trigger download
        await submitSyllabusRequest();
    });
}

async function submitSyllabusRequest() {
    const courseName = document.getElementById('syllabusCourseName')?.value || 'General';
    const name = document.getElementById('syllabusName').value.trim();
    const email = document.getElementById('syllabusEmail').value.trim();
    const phone = document.getElementById('syllabusPhone').value.trim();
    const careerStatus = document.getElementById('syllabusCareerStatus').value;
    
    try {
        // First, save the lead to contacts
        const contactResponse = await fetch('/api/contact', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name,
                email,
                phone,
                inquiryType: 'syllabus_download',
                serviceType: courseName,
                message: `Career Status: ${careerStatus}`
            })
        });
        
        const contactResult = await contactResponse.json();
        
        if (contactResult.success) {
            // Now try to get the syllabus file
            try {
                const syllabusResponse = await fetch('/api/syllabus');
                const syllabusResult = await syllabusResponse.json();
                
                if (syllabusResult.success && syllabusResult.data.length > 0) {
                    // Find matching syllabus or use first one
                    const syllabus = syllabusResult.data.find(s => 
                        s.courseId.toLowerCase().includes(courseName.toLowerCase())
                    ) || syllabusResult.data[0];
                    
                    if (syllabus.filePath) {
                        // Trigger download
                        const link = document.createElement('a');
                        link.href = syllabus.filePath;
                        link.download = `${syllabus.title || 'Course'}_Syllabus.pdf`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                    } else {
                        // Fallback: create sample PDF
                        createSampleDownload(courseName);
                    }
                } else {
                    // No syllabi available, create sample
                    createSampleDownload(courseName);
                }
            } catch (error) {
                console.error('Error fetching syllabus:', error);
                createSampleDownload(courseName);
            }
            
            // Show success message
            showSyllabusSuccess();
        } else {
            alert('Error: ' + contactResult.message);
        }
    } catch (error) {
        console.error('Error submitting syllabus request:', error);
        // Fallback to original behavior
        createSampleDownload(courseName);
        showSyllabusSuccess();
    }
}

function createSampleDownload(courseName) {
    const sampleContent = `CYBER ELITE ACADEMY - COURSE SYLLABUS\n\n` +
        `Course: ${courseName}\n\n` +
        `This is a comprehensive cybersecurity training program.\n\n` +
        `For more information, contact us at admissions@cyberelite.com`;
    
    const blob = new Blob([sampleContent], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${courseName.replace(/\s+/g, '_')}_Syllabus.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function showSyllabusSuccess() {
    const formContainer = document.querySelector('#syllabusForm .modal-form-container');
    const successMessage = document.querySelector('#syllabusModal .modal-success');
    
    if (formContainer && successMessage) {
        formContainer.style.display = 'none';
        successMessage.style.display = 'block';
    }
}

// Export for global access
window.CyberElite = window.CyberElite || {};
window.CyberElite.openSyllabusModal = openSyllabusModal;
    
    // ========================================
    // COURSE FILTERS
    // ========================================
    const filterButtons = document.querySelectorAll('.filter-btn');
    const courseCards = document.querySelectorAll('.course-card');
    
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Update active state
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const filter = btn.getAttribute('data-filter');
            
            // Filter courses
            courseCards.forEach(card => {
                if (filter === 'all' || card.getAttribute('data-category') === filter) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });
    
    // ========================================
    // CONTACT FORM TOGGLE
    // ========================================
    const toggleButtons = document.querySelectorAll('.toggle-btn');
    const corporateForm = document.getElementById('corporateForm');
    const academyForm = document.getElementById('academyForm');
    
    toggleButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            toggleButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            if (btn.getAttribute('data-toggle') === 'corporate') {
                if (corporateForm) corporateForm.style.display = 'block';
                if (academyForm) academyForm.style.display = 'none';
            } else {
                if (corporateForm) corporateForm.style.display = 'none';
                if (academyForm) academyForm.style.display = 'block';
            }
        });
    });
    
    // ========================================
    // FORM VALIDATION & SUBMISSION
    // ========================================
    const forms = document.querySelectorAll('form[data-validate]');
    
    forms.forEach(form => {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const inputs = form.querySelectorAll('input[required], textarea[required], select[required]');
            let isValid = true;
            
            inputs.forEach(input => {
                if (!input.value.trim()) {
                    isValid = false;
                    input.style.borderColor = '#ef4444';
                } else {
                    input.style.borderColor = '';
                }
            });
            
            if (!isValid) {
                alert('Please fill in all required fields.');
                return;
            }
            
            // Submit to backend
            const submitBtn = form.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            submitBtn.textContent = 'Submitting...';
            submitBtn.disabled = true;
            
            try {
                const formData = new FormData(form);
                const data = Object.fromEntries(formData.entries());
                
                // Determine endpoint based on form ID
                let endpoint = '/api/contact';
                if (form.id === 'academyForm') {
                    data.inquiryType = 'academy';
                } else if (form.id === 'corporateForm') {
                    data.inquiryType = 'corporate';
                } else if (form.id === 'careerForm') {
                    endpoint = '/api/careers';
                }
                
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });
                
                const result = await response.json();
                
                if (result.success) {
                    alert(result.message || 'Thank you! Your inquiry has been submitted successfully.');
                    form.reset();
                } else {
                    alert('Error: ' + result.message);
                }
            } catch (error) {
                alert('Error submitting form. Please try again later.');
                console.error('Form submission error:', error);
            } finally {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        });
    });
    
    // ========================================
    // FILE UPLOAD PREVIEW
    // ========================================
    const fileUploads = document.querySelectorAll('.file-upload');
    
    fileUploads.forEach(upload => {
        const input = upload.querySelector('input');
        const text = upload.querySelector('.file-upload-text');
        
        if (input && text) {
            input.addEventListener('change', function() {
                if (this.files && this.files[0]) {
                    text.textContent = `Selected: ${this.files[0].name}`;
                    upload.style.borderColor = 'var(--accent-cyan)';
                }
            });
        }
    });
    
    // ========================================
    // SMOOTH SCROLL FOR ANCHOR LINKS
    // ========================================
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href !== '#' && href.length > 1) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) {
                    target.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
    
    // ========================================
    // ANIMATION ON SCROLL (Simple Implementation)
    // ========================================
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe elements with fade-in class
    document.querySelectorAll('.fade-in').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
    
    // ========================================
    // STATS COUNTER ANIMATION
    // ========================================
    const statNumbers = document.querySelectorAll('.stat-item h3');
    
    const statsObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const target = entry.target;
                const finalValue = target.getAttribute('data-count');
                if (finalValue && !target.classList.contains('counted')) {
                    animateCounter(target, finalValue);
                    target.classList.add('counted');
                }
            }
        });
    }, { threshold: 0.5 });
    
    statNumbers.forEach(stat => statsObserver.observe(stat));
    
    function animateCounter(element, target) {
        const duration = 2000;
        const start = 0;
        const increment = target / (duration / 16);
        let current = start;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                element.textContent = formatNumber(target);
                clearInterval(timer);
            } else {
                element.textContent = formatNumber(Math.floor(current));
            }
        }, 16);
    }
    
    function formatNumber(num) {
        if (num >= 1000) {
            return (num / 1000).toFixed(0) + 'K+';
        }
        return num.toString();
    }
    
});

// ========================================
// UTILITY FUNCTIONS
// ========================================

// Get URL parameter
function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}

// Format phone number
function formatPhoneNumber(value) {
    const cleaned = ('' + value).replace(/\D/g, '');
    const match = /^(\d{3})(\d{3})(\d{4})$/.exec(cleaned);
    if (match) {
        return '(' + match[1] + ') ' + match[2] + '-' + match[3];
    }
    return value;
}

// Export for use in other scripts
window.CyberElite = {
    openSyllabusModal,
    formatPhoneNumber
};
