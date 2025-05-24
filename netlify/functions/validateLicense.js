// netlify/functions/validateLicense.js
const mongoose = require('mongoose');
const { json } = require('express');

// Conectar a MongoDB Atlas
const connectDb = async () => {
  if (mongoose.connections[0].readyState) return;
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
};

// Esquemas
const LicenseSchema = new mongoose.Schema({
  token: String,
  license_type: String,
  duration_days: Number,
  activation_date: Date,
  status: String,
  max_devices: Number,
});

const SessionSchema = new mongoose.Schema({
  token: String,
  device_id: String,
  last_check_in: Date,
  active: Boolean,
});

const License = mongoose.model('License', LicenseSchema);
const Session = mongoose.model('Session', SessionSchema);

exports.handler = async function (event, context) {
  // Conectar a la base de datos
  await connectDb();

  const { token, device_id } = JSON.parse(event.body);

  // Buscar licencia por token
  const license = await License.findOne({ token });
  if (!license || license.status !== 'active') {
    return {
      statusCode: 400,
      body: JSON.stringify({ valid: false, message: 'Licencia inválida o inactiva' }),
    };
  }

  // Verificar si la licencia ha expirado
  const expiry = new Date(license.activation_date);
  expiry.setDate(expiry.getDate() + license.duration_days);
  if (new Date() > expiry) {
    license.status = 'expired';
    await license.save();
    return {
      statusCode: 400,
      body: JSON.stringify({ valid: false, message: 'Licencia expirada' }),
    };
  }

  // Gestionar sesiones activas
  let sessions = await Session.find({ token, active: true });
  const activeDevices = sessions.length;

  // Comprobar si el número de dispositivos excede el máximo permitido
  if (!sessions.find((s) => s.device_id === device_id) && activeDevices >= license.max_devices) {
    return {
      statusCode: 400,
      body: JSON.stringify({ valid: false, message: 'Límite de dispositivos excedido' }),
    };
  }

  // Actualizar o crear sesión
  let session = await Session.findOne({ token, device_id });
  if (!session) {
    session = new Session({ token, device_id, last_check_in: new Date(), active: true });
  } else {
    session.last_check_in = new Date();
    session.active = true;
  }
  await session.save();

  // Responder con licencia válida
  return {
    statusCode: 200,
    body: JSON.stringify({ valid: true, expires: expiry.toISOString(), message: 'Licencia activa' }),
  };
};
