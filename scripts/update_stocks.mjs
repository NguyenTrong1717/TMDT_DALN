import { MongoClient } from "mongodb";

process.loadEnvFile?.();

const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
const dbName = process.env.DB_NAME || "tmdt_daln";

async function updateStocks() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    console.log(`Connected to MongoDB: ${dbName}`);

    const tables = [
      "catenogies",
      "products",
      "eventList",
      "LaptopUser",
      "ProductPagies",
      "ProductMenus",
      "appliances",
    ];

    let totalUpdated = 0;
    for (const table of tables) {
      const res = await db.collection(table).updateMany(
        {},
        {
          $set: {
            stock: 25,
            stockLeft: 25,
            status: "Còn hàng",
          },
        }
      );
      totalUpdated += res.modifiedCount;
      console.log(`  + [${table}]: updated ${res.modifiedCount} products`);
    }

    console.log(`🎉 Hoàn tất: Đã cập nhật tồn kho = 25 cho ${totalUpdated} sản phẩm trên MongoDB Atlas!`);
  } catch (err) {
    console.error("Lỗi:", err.message);
  } finally {
    await client.close();
  }
}

updateStocks();
