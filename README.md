# Cyber Elite - Enterprise Cybersecurity Platform

A modern, enterprise-grade cybersecurity services and training institute website with full backend integration.

## 🚀 Features

### Frontend
- **Modern Dark Theme** with glassmorphism and neon accents
- **Fully Responsive** design for all devices
- **Interactive Components**: Modals, forms, filters, animations
- **Multiple Pages**: Home, Services, Academy, About, Careers, Contact
- **Admin Dashboard**: Complete management interface

### Backend
- **Express.js Server** with RESTful API
- **File Upload System**: Syllabi and resume uploads with Multer
- **Contact Management**: Store and manage inquiries
- **Career Applications**: Job application tracking with resume storage
- **Syllabus Management**: Upload, download, and manage course syllabi
- **Admin Authentication**: Simple auth system for dashboard access
- **Data Persistence**: JSON-based storage (easily upgradable to database)

## 📁 Project Structure

```
/workspace
├── backend/
│   ├── server.js          # Main Express server
│   ├── routes/
│   │   ├── syllabus.js    # Syllabus CRUD + upload
│   │   ├── contact.js     # Contact form handling
│   │   ├── careers.js     # Job applications
│   │   └── admin.js       # Admin dashboard APIs
│   ├── middleware/
│   │   └── upload.js      # Multer file upload config
│   ├── uploads/
│   │   ├── syllabi/       # Uploaded syllabus files
│   │   └── resumes/       # Uploaded resume files
│   └── data/
│       ├── contacts.json  # Contact submissions
│       ├── applications.json  # Job applications
│       └── syllabi.json   # Syllabus metadata
├── css/
│   └── styles.css         # Complete styling
├── js/
│   ├── main.js            # Frontend interactions
│   └── admin.js           # Admin dashboard logic
├── index.html             # Home page
├── services.html          # Services page
├── academy.html           # Training institute
├── about.html             # About us
├── careers.html           # Careers page
├── contact.html           # Contact page
├── admin.html             # Admin dashboard
├── package.json
├── .env                   # Environment variables
└── README.md              # This file
```

## 🛠️ Installation & Setup

### 1. Install Dependencies

```bash
cd /workspace
npm install
```

### 2. Configure Environment Variables

Edit `.env` file:

```env
PORT=3000
NODE_ENV=development
UPLOAD_DIR=./backend/uploads
DATA_DIR=./backend/data
MAX_FILE_SIZE=10485760
ADMIN_USERNAME=admin
ADMIN_PASSWORD=cyberelite2024
```

### 3. Run the Server

**Development Mode** (with auto-reload):
```bash
npm run dev
```

**Production Mode**:
```bash
npm start
```

The server will start at `http://localhost:3000`

## 🔐 Admin Dashboard Access

Navigate to: `http://localhost:3000/admin.html`

**Default Credentials:**
- Username: `admin`
- Password: `cyberelite2024`

⚠️ **Important**: Change these credentials in production!

## 📡 API Endpoints

### Contact API (`/api/contact`)
- `POST /` - Submit contact inquiry
- `GET /` - Get all contacts (auth required)
- `GET /:id` - Get single contact (auth required)
- `PUT /:id` - Update contact (auth required)
- `DELETE /:id` - Delete contact (auth required)

### Careers API (`/api/careers`)
- `POST /` - Submit job application (with resume)
- `GET /` - Get all applications (auth required)
- `GET /:id` - Get single application (auth required)
- `PUT /:id` - Update application (auth required)
- `DELETE /:id` - Delete application (auth required)

### Syllabus API (`/api/syllabus`)
- `GET /` - Get all syllabi
- `GET /:id` - Get single syllabus
- `POST /` - Upload new syllabus (auth required)
- `PUT /:id` - Update syllabus (auth required)
- `DELETE /:id` - Delete syllabus (auth required)

### Admin API (`/api/admin`)
- `POST /login` - Admin login
- `GET /stats` - Dashboard statistics (auth required)
- `GET /files` - List uploaded files (auth required)
- `DELETE /files/:type/:filename` - Delete file (auth required)
- `GET /system` - System information (auth required)

## 🎯 Key Features Implementation

### File Upload System
- Supports PDF, DOC, DOCX formats
- Configurable file size limits (10MB for syllabi, 5MB for resumes)
- Automatic file renaming with timestamps
- Secure storage in dedicated directories

### Gated Syllabus Download
- Lead capture form before download
- Stores prospect information in database
- Automatically triggers file download after submission
- Fallback to sample PDF if no syllabus available

### Form Validation
- Client-side validation with regex patterns
- Email format validation
- Required field checking
- Real-time feedback

### Admin Dashboard
- Login authentication
- Statistics overview
- Contact management
- Application tracking
- File management
- Syllabus upload interface

## 🔒 Security Considerations

### For Production:
1. **Change default admin credentials** in `.env`
2. **Enable HTTPS** with SSL certificate
3. **Implement rate limiting** on API endpoints
4. **Add CORS restrictions** for specific domains
5. **Use environment-specific configs**
6. **Implement proper session management**
7. **Add input sanitization** middleware
8. **Set up database** instead of JSON files
9. **Enable logging and monitoring**
10. **Regular security audits**

## 📊 Data Storage

Currently uses JSON files for simplicity:
- `backend/data/contacts.json`
- `backend/data/applications.json`
- `backend/data/syllabi.json`

### Upgrade to Database:
Replace the JSON file operations in route handlers with:
- **MongoDB**: Use Mongoose ODM
- **PostgreSQL**: Use Sequelize or Prisma
- **MySQL**: Use Sequelize ORM

## 🌐 Frontend Pages

| Page | URL | Description |
|------|-----|-------------|
| Home | `/` | Landing page with hero, stats, dual focus |
| Services | `/services.html` | Enterprise security offerings |
| Academy | `/academy.html` | Course catalog with filters |
| About | `/about.html` | Company info, team, certifications |
| Careers | `/careers.html` | Job listings + application form |
| Contact | `/contact.html` | Dual inquiry forms (corporate/academy) |
| Admin | `/admin.html` | Management dashboard |

## 🎨 Design System

**Colors:**
- Background: `#0B0F19`, `#111827`
- Accent Cyan: `#00F2FE`
- Accent Blue: `#3B82F6`
- Success Green: `#10B981`

**Typography:**
- Primary: Inter
- Headings: Space Grotesk

**Effects:**
- Glassmorphism (backdrop-filter blur)
- Neon glow borders
- Smooth transitions
- Hover animations

## 🧪 Testing

Test the forms:
1. **Contact Form**: Fill and submit on contact page
2. **Syllabus Download**: Click "Download Syllabus" on academy page
3. **Job Application**: Apply on careers page with resume
4. **Admin Dashboard**: Login and view submissions

Check backend data:
```bash
cat backend/data/contacts.json
cat backend/data/applications.json
cat backend/data/syllabi.json
ls backend/uploads/syllabi/
ls backend/uploads/resumes/
```

## 📦 Deployment

### Option 1: Node.js Hosting (Heroku, Railway, Render)
```bash
# Set environment variables in hosting platform
# Deploy from Git repository
```

### Option 2: VPS/Dedicated Server
```bash
# Install Node.js
# Clone repository
# npm install --production
# pm2 start backend/server.js --name cyber-elite
```

### Option 3: Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["node", "backend/server.js"]
```

## 🤝 Support

For issues or questions:
- Check console logs for errors
- Verify `.env` configuration
- Ensure proper file permissions on upload directories
- Review API endpoint documentation

---

**Built with ❤️ by Cyber Elite Team**
