const Hapi = require('@hapi/hapi');
const { loadModel, predict } = require('./inference');
const { v4: uuidv4 } = require('uuid');

(async () => {
  // load and get machine learning model
  const model = await loadModel();
  console.log('Model loaded!');

  // initializing HTTP server
  const server = Hapi.server({
    host: process.env.NODE_ENV !== 'production' ? 'localhost' : '0.0.0.0',
    port: 3000,
  });

  server.route({
    method: 'POST',
    path: '/predict',
    handler: async (request, h) => {
      try {
        // get image that uploaded by user
        const { image } = request.payload;

        // validate if no image is provided
        if (!image) {
          return h
            .response({
              status: 'fail',
              message: 'Terjadi kesalahan dalam melakukan prediksi',
            })
            .code(400);
        }

        // check image size
        if (image._data.length > 1000000) {
          return h
            .response({
              status: 'fail',
              message:
                'Payload content length greater than maximum allowed: 1000000',
            })
            .code(413);
        }

        // do and get prediction result by giving model and image
        const predictions = await predict(model, image._data);

        // get prediction result
        const result = predictions.includes('cancer') ? 'Cancer' : 'Non-cancer';
        const suggestion =
          result === 'Cancer'
            ? 'Segera periksa ke dokter!'
            : 'Penyakit kanker tidak terdeteksi.';

        return h.response({
          status: 'success',
          message: 'Model is predicted successfully',
          data: {
            id: uuidv4(),
            result,
            suggestion,
            createdAt: new Date().toISOString(),
          },
        });
      } catch (error) {
        console.error(error);
        return h
          .response({
            status: 'fail',
            message: 'Terjadi kesalahan dalam melakukan prediksi',
          })
          .code(400);
      }
    },
    options: {
      payload: {
        allow: 'multipart/form-data',
        multipart: true,
        output: 'file',
        parse: true,
        maxBytes: 1000000, // set maximum payload size to 1MB
      },
    },
  });

  // running server
  await server.start();

  console.log(`Server started at: ${server.info.uri}`);
})();
