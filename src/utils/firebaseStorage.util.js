// const { getStorage } = require("firebase-admin/storage");
// const admin = require("firebase-admin");

// if (!admin.apps.length) {
//   admin.initializeApp({
//     credential: admin.credential.applicationDefault(),
//     storageBucket: storage.bucket(), // lấy từ env
//   });
// }

// const bucket = getStorage().bucket();

// async function uploadFileToFirebaseStorage(file) {
//   try {
//     const fileName = Date.now() + '-' + file.originalname;  // Tạo tên file duy nhất
//     const fileUpload = bucket.file(fileName);

//     const stream = fileUpload.createWriteStream({
//       metadata: {
//         contentType: file.mimetype,  // Loại MIME của file
//       },
//     });

//     return new Promise((resolve, reject) => {
//       stream.on('finish', async () => {
//         // Sau khi upload xong, lấy URL của file
//         const fileUrl = `https://storage.googleapis.com/${bucket.name}/${fileUpload.name}`;
//         const [metadata] = await fileUpload.getMetadata();  // Lấy metadata của file
//         resolve({
//           url: fileUrl,
//           name: fileName,
//           size: metadata.size,  // Kích thước file
//         });
//       });

//       stream.on('error', (error) => {
//         reject(error);
//       });

//       // Ghi file vào stream
//       stream.end(file.buffer);
//     });
//   } catch (error) {
//     throw new Error('Firebase upload failed: ' + error.message);
//   }
// }


// module.exports = { uploadFileToFirebaseStorage };
