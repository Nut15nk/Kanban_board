const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const boardRoutes = require('./routes/boardRoutes.js');
const authMiddleware = require('./authMiddleware');
const {
    resetPassword,
    updatePassword,
    registerUser,
    loginUser,
    authenticate,
    protectedRoute,
    logoutUser
} = require('./controller/backed_config');

const app = express();
const jsonParser = bodyParser.json();

app.use(cors());
app.use(express.json({ limit: '10mb' })); // ขนาดสูงสุดเป็น 10 MB
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ตั้งค่า API routes
app.post('/reset-password', jsonParser, resetPassword);
app.post('/reset-password/:token', jsonParser, updatePassword);
app.post('/register', jsonParser, registerUser);
app.post('/login', jsonParser, loginUser);
app.post('/authen', jsonParser, authMiddleware, authenticate);
app.get('/protected', authMiddleware, protectedRoute);
app.post('/logout', jsonParser, logoutUser);

// ตั้งค่า routes สำหรับ boards, columns, และ tasks
app.use('/api', boardRoutes);


app.listen(3333, function () {
    console.log('CORS-enabled web server listening on port 3333');
});
