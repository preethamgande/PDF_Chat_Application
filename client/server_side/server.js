const express = require("express");
const cors = require("cors");
const multer = require("multer");
const pdf = require("pdf-parse");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fsPromises = require("fs").promises;
require("dotenv").config();

// establish connection with mongoDB

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("Connected to MongoDB"))
  .catch((error) => console.error("Could not connect to the database", error));

//defining a schema for chat messages and pdfs
const chatSchema = new mongoose.Schema({
  sessionId: { type: String, required: true },
  userQuery: { type: String, required: true },
  aiResponse: { type: String, required: true },
  pdfUrl: { type: String },
  extractedText: { type: String },
  timeStamp: { type: Date, default: Date.now },
});

const Chat = mongoose.model("Chat", chatSchema);

const app = express();
const port = process.env.PORT || 5000;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// middlware
app.use(cors());
app.use(express.json());

// settingup the storage for uploaded files
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) =>
    cb(
      null,
      `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`
    ),
});

const upload = multer({ storage });

const uploadDir = "uploads";
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// making sure the folder is publicly accessible..
app.use("/uploads", express.static(uploadDir));

// Making sure teh server is working..
app.get("/", (req, res) => {
  res.send("PDF chat backend is running");
});

// Route for PDF file upload..
app.post("/upload-pdf", upload.single("pdfFile"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No file uploaded" });
  }
  const filePath = req.file.path;

  try {
    const dataBuffer = await fsPromises.readFile(filePath);
    const data = await pdf(dataBuffer);

    // split document text by page breaks
    const pages = data.text.split("/f");

    let formattedText = "";
    pages.forEach((pageText, index) => {
      formattedText += `\n\n--- Page ${index + 1} ---\n${pageText.trim()}`;
    });

    console.log(
      "Exracted text from pdf: ",
      formattedText.substring(0, 10) + "..."
    );

    const publicUrl = `${req.protocol}://${req.get("host")}/uploads/${
      req.file.filename
    }`;

    res.status(200).json({
      message: "file uploaded and processed successfully",
      extractedText: formattedText,
      fileUrl: publicUrl,
    });
  } catch (err) {
    console.error("error processing pdf:", err);
    res
      .status(500)
      .json({ message: "Failed to process pdf", error: err.message });
  }
});

// Route for handling chat queries...

app.post("/chat", async (req, res) => {
  const { userQuery, extractedText, sessionId } = req.body;
  if (!userQuery || !extractedText || !sessionId) {
    return res
      .status(400)
      .json({ message: "Missing user query, extracted text or sessionId" });
  }
  try {
    const prompt = `You are an intelligent assistant helping the user understand a document. 
Your task is to answer questions based only on the provided document text. 
Follow these rules strictly:

1. **Be concise but detailed** - answer clearly and provide supporting information.
2. **Citations** - always mention the page number if the information can be traced (e.g., "(Page 3)").
3. **Faithfulness** - do not make up information. If the answer is not in the document, say: 
   "The document does not provide enough information to answer this question."
4. **Summarize if needed** - if the user’s query is broad, provide a well-structured summary instead of a long raw dump.
5. **Format answers clearly** - use bullet points, short paragraphs, or numbered lists when appropriate.
    Document Text: ${extractedText}
    User Question: ${userQuery}`;

    const result = await model.generateContent(prompt);
    console.log("chat received: ", req.body);
    const aiResponse = result.response.text();

    // saving the chat to db
    const newChat = new Chat({
      sessionId: sessionId,
      userQuery: userQuery,
      aiResponse: aiResponse,
    });
    await newChat.save();

    res.status(200).json({ aiResponse });
  } catch (error) {
    console.error("Error generating AI resonse:", error);
    res.status(500).json({
      message: "Failed to generate AI response.",
      error: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
