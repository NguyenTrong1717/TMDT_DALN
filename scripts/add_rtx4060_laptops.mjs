import fs from "fs";
import { MongoClient } from "mongodb";

process.loadEnvFile?.();

const NEW_LAPTOPS_4060 = [
  {
    id: "11",
    name: "Laptop Gaming Lenovo LOQ 15IRX9 (Core i5-13450HX, 16GB RAM, 512GB SSD, RTX 4060 8GB, 15.6 inch FHD 144Hz G-Sync)",
    price: 22990000,
    oldPrice: 26990000,
    discount: 15,
    category: "laptop-gaming",
    status: "Còn hàng",
    soldPercent: 85,
    stockLeft: 6,
    image: "/images/LT11.png",
    flashSale: true,
    rating: 4.9,
    reviewsCount: 48,
    stock: 25,
    sold: 95,
  },
  {
    id: "12",
    name: "Laptop Gaming Acer Nitro 16 Phoenix AN16-41-R5M4 (Ryzen 7 7840HS, 16GB, 512GB, RTX 4060 8GB, 16 inch WQXGA 165Hz sRGB 100%)",
    price: 25990000,
    oldPrice: 29990000,
    discount: 13,
    category: "laptop-gaming",
    status: "Còn hàng",
    soldPercent: 78,
    stockLeft: 4,
    image: "/images/LT12.png",
    flashSale: true,
    rating: 5,
    reviewsCount: 62,
    stock: 18,
    sold: 80,
  },
  {
    id: "13",
    name: "Laptop Gaming ASUS TUF Gaming A15 FA507NV-LP046W (Ryzen 7 7735HS, 16GB, 512GB, RTX 4060 8GB, 15.6 inch FHD 144Hz 100% sRGB)",
    price: 24490000,
    oldPrice: 28490000,
    discount: 14,
    category: "laptop-gaming",
    status: "Còn hàng",
    soldPercent: 82,
    stockLeft: 5,
    image: "/images/lap01.png",
    flashSale: false,
    rating: 4.8,
    reviewsCount: 37,
    stock: 22,
    sold: 88,
  },
  {
    id: "14",
    name: "Laptop Gaming MSI Katana 15 B13VFK-676VN (Core i7-13620H, 16GB, 1TB SSD, RTX 4060 8GB, 15.6 inch FHD 144Hz)",
    price: 26990000,
    oldPrice: 31990000,
    discount: 16,
    category: "laptop-gaming",
    status: "Còn hàng",
    soldPercent: 65,
    stockLeft: 7,
    image: "/images/lap02.jpg",
    flashSale: true,
    rating: 4.9,
    reviewsCount: 51,
    stock: 15,
    sold: 60,
  },
  {
    id: "15",
    name: "Laptop Gaming Dell G15 5530 (Core i7-13650HX, 16GB RAM, 512GB SSD, RTX 4060 8GB, 15.6 inch FHD 165Hz sRGB 100%)",
    price: 28490000,
    oldPrice: 33000000,
    discount: 14,
    category: "laptop-gaming",
    status: "Còn hàng",
    soldPercent: 60,
    stockLeft: 3,
    image: "/images/LT18.webp",
    flashSale: false,
    rating: 4.7,
    reviewsCount: 29,
    stock: 12,
    sold: 45,
  },
];

for (const filePath of ["database/seed_data.json", "db.json"]) {
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, "utf8"));
    data.LaptopUser = data.LaptopUser || [];
    for (const lap of NEW_LAPTOPS_4060) {
      const idx = data.LaptopUser.findIndex((l) => String(l.id) === String(lap.id));
      if (idx >= 0) {
        data.LaptopUser[idx] = lap;
      } else {
        data.LaptopUser.push(lap);
      }
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
    console.log(`✅ Updated ${filePath} with ${NEW_LAPTOPS_4060.length} RTX 4060 gaming laptops.`);
  }
}

async function updateMongo() {
  const uri = process.env.MONGO_URI || "mongodb://localhost:27017";
  const dbName = process.env.DB_NAME || "tmdt_daln";
  try {
    const client = new MongoClient(uri);
    await client.connect();
    const db = client.db(dbName);
    for (const lap of NEW_LAPTOPS_4060) {
      await db.collection("LaptopUser").updateOne({ id: lap.id }, { $set: lap }, { upsert: true });
    }
    console.log("✅ Successfully updated MongoDB collection LaptopUser with RTX 4060 gaming laptops!");
    await client.close();
  } catch (err) {
    console.log("ℹ️ MongoDB note:", err.message);
  }
}

updateMongo();
