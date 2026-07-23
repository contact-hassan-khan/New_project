// Cyber Elite Admin Dashboard JavaScript

const API_BASE = '/api';
let currentUser = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    setupEventListeners();
});

// Check authentication status
function checkAuth() {
    const token = localStorage.getItem('adminToken');
    const user = localStorage.getItem('adminUser');
    
    if (token && user) {
        currentUser = JSON.parse(user);
        showDashboard();
    } else {
        showLogin();
    }
}

// Show login page
function showLogin() {
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('dashboardPage').classList.add('hidden');
}

// Show dashboard
function showDashboard() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('dashboardPage').classList.remove('hidden');
    
    if (currentUser) {
        document.getElementById('userName').textContent = currentUser.name.split(' ')[0];
        document.getElementById('userDisplayName').textContent = currentUser.name;
        document.getElementById('userRole').textContent = currentUser.role === 'admin' ? 'Administrator' : 'Instructor';
        document.getElementById('userAvatar').textContent = currentUser.name.charAt(0).toUpperCase();
    }
    
    loadDashboardStats();
    loadContacts();
    loadApplications();
    loadSyllabi();
    loadLogs();
    loadLogoVersions();
}

function setupEventListeners() {
    document.getElementById('loginForm')?.addEventListener('submit', handleLogin);
    document.getElementById('logoutBtn')?.addEventListener('click', handleLogout);
    
    document.querySelectorAll('.nav-link[data-tab]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            switchTab(link.getAttribute('data-tab'));
        });
    });
    
    const dropZone = document.getElementById('logoDropZone');
    const logoInput = document.getElementById('logoInput');
    
    if (dropZone && logoInput) {
        dropZone.addEventListener('click', () => logoInput.click());
        logoInput.addEventListener('change', handleLogoUpload);
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--accent-cyan)';
        });
        
        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'rgba(255, 255, 255, 0.2)';
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            if (e.dataTransfer.files.length > 0) uploadLogoFile(e.dataTransfer.files[0]);
        });
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const alertDiv = document.getElementById('loginAlert');
    
    try {
        const response = await fetch(`${API_BASE}/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        if (data.success) {
            localStorage.setItem('adminToken', data.token);
            localStorage.setItem('adminUser', JSON.stringify(data.user));
            currentUser = data.user;
            alertDiv.classList.add('hidden');
            showDashboard();
        } else {
            alertDiv.textContent = data.message || 'Invalid credentials';
            alertDiv.classList.remove('hidden');
        }
    } catch (error) {
        alertDiv.textContent = 'Connection error. Please try again.';
        alertDiv.classList.remove('hidden');
    }
}

function handleLogout(e) {
    e.preventDefault();
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminUser');
    currentUser = null;
    showLogin();
}

function switchTab(tabId) {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.getAttribute('data-tab') === tabId);
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.toggle('active', content.id === tabId);
    });
    
    const loaders = { overview: loadDashboardStats, contacts: loadContacts, applications: loadApplications, syllabi: loadSyllabi, logos: loadLogoVersions, logs: loadLogs };
    if (loaders[tabId]) loaders[tabId]();
}

async function loadDashboardStats() {
    try {
        const [contactsRes, applicationsRes, syllabiRes] = await Promise.all([
            fetch(`${API_BASE}/contact`, { headers: getAuthHeaders() }),
            fetch(`${API_BASE}/careers`, { headers: getAuthHeaders() }),
            fetch(`${API_BASE}/syllabus`, { headers: getAuthHeaders() })
        ]);
        
        const contacts = await contactsRes.json();
        const applications = await applicationsRes.json();
        const syllabi = await syllabiRes.json();
        
        document.getElementById('totalContacts').textContent = contacts.count || 0;
        document.getElementById('totalApplications').textContent = applications.count || 0;
        document.getElementById('totalSyllabi').textContent = syllabi.count || 0;
        document.getElementById('totalDownloads').textContent = syllabi.data?.reduce((sum, s) => sum + (s.downloadCount || 0), 0) || 0;
        
        loadRecentActivity(contacts.data, applications.data, syllabi.data);
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

function loadRecentActivity(contacts, applications, syllabi) {
    const container = document.getElementById('recentActivity');
    const activities = [
        ...(contacts || []).slice(0, 3).map(c => ({ title: `New inquiry from ${c.name}`, time: c.createdAt, icon: '📧' })),
        ...(applications || []).slice(0, 3).map(a => ({ title: `${a.name} applied for ${a.position}`, time: a.appliedAt, icon: '💼' })),
        ...(syllabi || []).slice(0, 3).map(s => ({ title: `Syllabus uploaded: ${s.title}`, time: s.uploadedAt, icon: '📚' }))
    ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5);
    
    container.innerHTML = activities.length ? activities.map(a => `
        <div style="display:flex;align-items:center;gap:1rem;padding:0.75rem 0;border-bottom:1px solid rgba(255,255,255,0.05)">
            <div style="font-size:1.5rem">${a.icon}</div>
            <div style="flex:1">
                <div style="font-weight:500">${a.title}</div>
                <div style="font-size:0.75rem;color:var(--text-secondary)">${formatDate(a.time)}</div>
            </div>
        </div>
    `).join('') : '<p style="color:var(--text-secondary)">No recent activity</p>';
}

async function loadContacts() {
    const response = await fetch(`${API_BASE}/contact`, { headers: getAuthHeaders() });
    const data = await response.json();
    const tbody = document.getElementById('contactsTable');
    
    if (!data.data?.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-secondary)">No contacts found</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.data.map(c => `
        <tr>
            <td>${c.name}</td><td>${c.email}</td><td>${capitalizeFirst(c.inquiryType||'general')}</td>
            <td>${formatDate(c.createdAt)}</td>
            <td><span class="status-badge status-${c.status}">${c.status}</span></td>
            <td><button class="btn btn-secondary" style="padding:0.25rem 0.5rem;font-size:0.75rem" onclick="viewContact('${c.id}')">View</button></td>
        </tr>
    `).join('');
}

async function loadApplications() {
    const response = await fetch(`${API_BASE}/careers`, { headers: getAuthHeaders() });
    const data = await response.json();
    const tbody = document.getElementById('applicationsTable');
    
    if (!data.data?.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-secondary)">No applications found</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.data.map(a => `
        <tr>
            <td>${a.name}</td><td>${a.position}</td><td>${a.email}</td>
            <td>${formatDate(a.appliedAt)}</td>
            <td><span class="status-badge status-${a.status}">${a.status}</span></td>
            <td>
                <button class="btn btn-secondary" style="padding:0.25rem 0.5rem;font-size:0.75rem" onclick="viewApplication('${a.id}')">View</button>
                <a href="${a.resumeFilePath}" target="_blank" class="btn btn-primary" style="padding:0.25rem 0.5rem;font-size:0.75rem;text-decoration:none;display:inline-block">Resume</a>
            </td>
        </tr>
    `).join('');
}

async function loadSyllabi() {
    const response = await fetch(`${API_BASE}/syllabus`, { headers: getAuthHeaders() });
    const data = await response.json();
    const tbody = document.getElementById('syllabiTable');
    
    if (!data.data?.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-secondary)">No syllabi found</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.data.map(s => `
        <tr>
            <td>${s.title}</td><td>${s.courseId}</td>
            <td>${s.fileName?'PDF':s.googleDocsLink?'Google Docs':'N/A'}</td>
            <td>${s.downloadCount||0}</td><td>${formatDate(s.uploadedAt)}</td>
            <td>
                ${s.filePath?`<a href="${s.filePath}" target="_blank" class="btn btn-secondary" style="padding:0.25rem 0.5rem;font-size:0.75rem;text-decoration:none;display:inline-block">Download</a>`:''}
                ${s.googleDocsLink?`<a href="${s.googleDocsLink}" target="_blank" class="btn btn-secondary" style="padding:0.25rem 0.5rem;font-size:0.75rem;text-decoration:none;display:inline-block">View Docs</a>`:''}
                <button class="btn btn-danger" style="padding:0.25rem 0.5rem;font-size:0.75rem" onclick="deleteSyllabus('${s.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

async function loadLogoVersions() {
    const response = await fetch(`${API_BASE}/logo/versions`, { headers: getAuthHeaders() });
    const configRes = await fetch(`${API_BASE}/logo/current`, { headers: getAuthHeaders() });
    const data = await response.json();
    const configData = await configRes.json();
    const currentLogoId = configData.data?.currentLogo?.id;
    const container = document.getElementById('logoVersions');
    
    if (!data.data?.length) {
        container.innerHTML = '<p style="color:var(--text-secondary);grid-column:1/-1;text-align:center;padding:2rem">No logos uploaded yet</p>';
        return;
    }
    
    container.innerHTML = data.data.map(logo => `
        <div class="logo-item ${logo.id===currentLogoId?'current':''}" onclick="setCurrentLogo('${logo.id}')">
            <img src="${logo.path}" alt="${logo.originalName}">
            <div class="logo-item-name">${logo.originalName}</div>
            <div style="font-size:0.625rem;color:var(--text-secondary);margin-top:0.25rem">
                ${logo.id===currentLogoId?'✓ Current':'Click to set as current'}
            </div>
        </div>
    `).join('');
}

function handleLogoUpload(e) { if (e.target.files[0]) uploadLogoFile(e.target.files[0]); }

async function uploadLogoFile(file) {
    const formData = new FormData();
    formData.append('logo', file);
    formData.append('uploadedBy', currentUser?.username || 'admin');
    
    try {
        const response = await fetch(`${API_BASE}/logo/upload`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: formData
        });
        const data = await response.json();
        if (data.success) { alert('Logo uploaded successfully!'); loadLogoVersions(); }
        else alert('Error: ' + data.message);
    } catch (error) {
        console.error('Error uploading logo:', error);
        alert('Error uploading logo');
    }
}

async function setCurrentLogo(logoId) {
    try {
        const response = await fetch(`${API_BASE}/logo/set-current/${logoId}`, {
            method: 'PUT',
            headers: getAuthHeaders()
        });
        const data = await response.json();
        if (data.success) { alert('Logo updated!'); loadLogoVersions(); window.location.reload(); }
        else alert('Error: ' + data.message);
    } catch (error) {
        alert('Error updating logo');
    }
}

async function loadLogs() {
    const response = await fetch(`${API_BASE}/admin/logs`, { headers: getAuthHeaders() });
    const data = await response.json();
    const tbody = document.getElementById('logsTable');
    
    if (!data.data?.length) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-secondary)">No logs found</td></tr>';
        return;
    }
    
    tbody.innerHTML = data.data.slice(0, 50).map(log => `
        <tr>
            <td>${formatDateTime(log.timestamp)}</td>
            <td><span class="status-badge status-new">${log.action}</span></td>
            <td style="font-size:0.875rem">${JSON.stringify(log.details)}</td>
            <td>${log.user}</td>
        </tr>
    `).join('');
}

async function deleteSyllabus(id) {
    if (!confirm('Delete this syllabus?')) return;
    try {
        const response = await fetch(`${API_BASE}/syllabus/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
        const data = await response.json();
        if (data.success) { alert('Deleted'); loadSyllabi(); }
        else alert('Error: ' + data.message);
    } catch (error) { alert('Error deleting syllabus'); }
}

function getAuthHeaders() {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` };
}

function formatDate(d) { return new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' }); }
function formatDateTime(d) { return new Date(d).toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' }); }
function capitalizeFirst(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function showUploadSyllabusModal() {
    const title = prompt('Enter syllabus title:');
    if (!title) return;
    const courseId = prompt('Enter course ID:');
    if (!courseId) return;
    const googleDocsLink = prompt('Enter Google Docs link (optional):');
    
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,.doc,.docx';
    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file && !googleDocsLink) { alert('Please upload a file or provide Google Docs link'); return; }
        
        const formData = new FormData();
        formData.append('title', title);
        formData.append('courseId', courseId);
        formData.append('uploadedBy', currentUser?.username || 'admin');
        if (googleDocsLink) formData.append('googleDocsLink', googleDocsLink);
        if (file) formData.append('file', file);
        
        try {
            const response = await fetch(`${API_BASE}/syllabus`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('adminToken')}` },
                body: formData
            });
            const data = await response.json();
            if (data.success) { alert('Uploaded!'); loadSyllabi(); }
            else alert('Error: ' + data.message);
        } catch (error) { alert('Error uploading syllabus'); }
    };
    fileInput.click();
}

function viewContact(id) { alert('View contact: ' + id); }
function viewApplication(id) { alert('View application: ' + id); }
