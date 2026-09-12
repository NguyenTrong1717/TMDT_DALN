import jsonServer from "json-server";

const server = jsonServer.create();
const router = jsonServer.router("db.json");
const middlewares = jsonServer.defaults();

server.use(middlewares);
server.use(jsonServer.bodyParser);

// Tự xử lý DELETE để tránh bug của json-server 0.17.x
server.delete("/:resource/:id", (req, res) => {
  const { resource, id } = req.params;

  try {
    const db = router.db;
    const data = db.get(resource).value();

    if (!Array.isArray(data)) {
      return res.status(404).json({
        message: "Không tồn tại resource",
      });
    }

    const newData = data.filter((item) => String(item.id) !== String(id));

    if (newData.length === data.length) {
      return res.status(404).json({
        message: `Không tìm thấy id ${id}`,
      });
    }

    db.set(resource, newData).write();

    return res.status(200).json({
      success: true,
      message: "Xóa thành công",
    });
  } catch (error) {
    console.error("DELETE ERROR:", error);

    return res.status(500).json({
      message: error.message,
    });
  }
});

// Các request khác giao cho json-server
server.use((req, res, next) => {
  router.db.read();
  next();
});

server.use(router);

// reload db trước mỗi request
server.use((req, res, next) => {
  router.db.read();
  next();
});

server.use(router);

server.listen(3000, () => {
  console.log("JSON Server chạy tại http://localhost:3000");
});
