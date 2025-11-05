import express from "express";
import multer from "multer";
import xlsx from "xlsx";
import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";

const app = express();
const prisma = new PrismaClient();

const upload = multer({ dest: "uploads/" });

app.use(express.json());

app.post("/import/customers", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const filePath = path.resolve(req.file.path);
    const workbook = xlsx.readFile(filePath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);

    const validRows = rows.filter(
      (r) => r.fullName && r.email && r.phone && r.city && r.joinedAt
    );

    const formattedData = validRows.map((r) => ({
      fullName: r.fullName,
      email: r.email,
      phone: r.phone.toString(),
      city: r.city,
      joinedAt: new Date(r.joinedAt),
    }));

    await prisma.customer.createMany({
      data: formattedData,
      skipDuplicates: true,
    });

    fs.unlinkSync(filePath);
    res.json({
      message: "✅ Data imported successfully",
      count: formattedData.length,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error importing data" });
  }
});

app.get("/customers", async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { joinedAt: "desc" },
    });
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

//step1 : npm i @prisma/client
//step2 : npm i prisma -D
//step3 : npx prisma init --datasource-provider postgresql
//step4 : get tables form chatgpt to put them on prisma/schema.prisma
//step5 : npx prisma db push
//optional : npx prisma studio
