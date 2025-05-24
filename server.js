// Importar dependencias
const express = require('express');
const mongoose = require('mongoose');

// Crear una nueva aplicación Express
const app = express();

// Middleware para parsear JSON en las solicitudes
app.use(express.json());

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Conectado a MongoDB'))
  .catch((err) => console.error('Error al conectar con MongoDB:', err));

// Ruta de prueba (GET)
app.get('/', (req, res) => {
  res.send('¡Servidor funcionando!');
});

// Ruta para validar licencia (POST)
app.post('/validate-license', (req, res) => {
  const { token, device_id } = req.body;  // Obtener los datos del cuerpo de la solicitud

  // Lógica de validación (aquí puedes agregar más lógica de verificación)
  if (!token || !device_id) {
    return res.status(400).json({ message: 'Token y device_id son necesarios' });
  }

  // Responder con éxito (puedes personalizar esta lógica)
  res.status(200).json({ message: 'Licencia validada', token, device_id });
});

// Puerto donde escuchará el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en el puerto ${PORT}`);
});
