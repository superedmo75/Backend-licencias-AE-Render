// Importar dependencias
const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');  // Importa la librería UUID

// Obtener la URI de MongoDB desde las variables de entorno
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('La variable de entorno MONGODB_URI no está configurada.');
}

// Conectar a MongoDB
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('Conectado a MongoDB'))
  .catch((err) => console.error('Error al conectar con MongoDB:', err));

// Definir el esquema de licencias
const sessionSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  device_id: String,
  last_check_in: Date,
  active: { type: Boolean, default: true },
  max_devices: { type: Number, default: 1 }
});

// Crear el modelo de la colección "sessions"
const Session = mongoose.model('Session', sessionSchema);

// Función para generar un token único
function generarTokenUnico() {
  return uuidv4();  // Genera y retorna un UUID único
}

// Función para almacenar una nueva licencia
async function almacenarLicencia(device_id) {
  const token = generarTokenUnico();  // Genera un token único

  // Crear un nuevo documento con la licencia
  const newSession = new Session({
    token: token,
    device_id: device_id,
    last_check_in: new Date(),
    active: true,
    max_devices: 1  // Puedes cambiar el número de dispositivos según el plan
  });

  // Guardar la sesión en MongoDB
  await newSession.save();
  return token;  // Retorna el token generado
}

// Función para validar la licencia
exports.handler = async (event, context) => {
  try {
    // Obtener los datos enviados en el cuerpo de la solicitud
    const { token, device_id } = JSON.parse(event.body);

    // Buscar el documento de la licencia
    const session = await Session.findOne({ token: token, device_id: device_id });

    if (!session) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Licencia no válida o no encontrada.' }),
      };
    }

    // Verificar si la licencia está activa
    if (!session.active) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'La licencia ha expirado o está desactivada.' }),
      };
    }

    // Verificar si el dispositivo ha superado el número máximo permitido
    if (session.max_devices && session.max_devices <= 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Número máximo de dispositivos alcanzado.' }),
      };
    }

    // Actualizar la fecha de "check-in"
    session.last_check_in = new Date();
    await session.save();

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Licencia validada con éxito', token: token, device_id: device_id }),
    };
  } catch (error) {
    console.error('Error al procesar la solicitud:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Error en el servidor. Intenta más tarde.' }),
    };
  }
};
