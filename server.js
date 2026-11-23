const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const User = require('./models/user');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;


// Middlewares
app.use(cors());
app.use(express.json());

// 🔌 Reemplaza con tu cadena de conexión real de MongoDB Atlas
const MONGO_URI = "mongodb+srv://admin_mathcoins:dB2SB4xL914xceCu@cluster0.x2uhvog.mongodb.net/mathcoins_db?retryWrites=true&w=majority";
// Conexión a MongoDB
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Conectado exitosamente a MongoDB Atlas'))
    .catch((err) => console.error('❌ Error al conectar a MongoDB:', err));

// Ruta de prueba
app.get('/', (req, res) => {
    res.json({ mensaje: '¡El servidor de MathCoins está conectado a MongoDB!' });
});

// ==========================================
// RUTAS DE AUTENTICACIÓN (REGISTRO Y LOGIN)
// ==========================================

// 1. Ruta para REGISTRAR un nuevo usuario
app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // Verificar si el usuario o correo ya existen
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ error: 'El nombre de usuario o correo ya está en uso.' });
        }

        // Encriptar la contraseña
        const hashedPassword = await bcrypt.hash(password, 10);

        // Crear y guardar el nuevo usuario
        const newUser = new User({
            username,
            email,
            password: hashedPassword
        });

        await newUser.save();
        res.status(201).json({ mensaje: 'Usuario registrado exitosamente' });

    } catch (error) {
        console.error('Error en el registro:', error);
        res.status(500).json({ error: 'Error interno al registrar el usuario' });
    }
});

// 2. Ruta para INICIAR SESIÓN (Login)
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Buscar al usuario por su username
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }

        // Comparar la contraseña ingresada con la encriptada en la base de datos
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
        }

        // Login exitoso
        res.json({ 
            mensaje: 'Inicio de sesión exitoso',
            usuario: {
                id: user._id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error('Error en el login:', error);
        res.status(500).json({ error: 'Error interno al iniciar sesión' });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});