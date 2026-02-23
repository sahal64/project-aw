const multer = require("multer");
const path = require("path");

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB max
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);

    if (ext && mime) {
      cb(null, true);
    } else {
      cb("Only images allowed");
    }
  },
});

module.exports = upload;
