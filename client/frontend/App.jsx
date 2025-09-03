import "./index.css";
import PdfUpload from "./PdfUpload";
import PdfChatInterface from "./PdfChatInterface";
import { useState } from "react";

function App() {
  const [showChatInterface, setShowChatInterface] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [extractedText, setExtractedText] = useState("");
  const [sessionId, setSessionId] = useState(null);

  const handleFileUploadSuccess = (url, text) => {
    setPdfUrl(url);
    setExtractedText(text);
    setSessionId(Date.now().toString());
    setShowChatInterface(true);
  };
  // const handleFileUploadSuccess = () => {
  //   setShowChatInterface(true);
  // };

  // const handlePdfSelectedLocally = (url) => {
  //   setPdfUrl(url);
  // };

  const handleCloseChat = () => {
    setShowChatInterface(false);
    setPdfUrl(null);
    setExtractedText("");
    setSessionId(null);
  };
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center font-inter p-4">
      {!showChatInterface ? (
        <PdfUpload
          onFileUploadSuccess={handleFileUploadSuccess}
          onPdfSelectedLocally={(url) => setPdfUrl(url)}
        />
      ) : (
        <PdfChatInterface
          pdfUrl={pdfUrl}
          onCloseChat={handleCloseChat}
          extractedText={extractedText}
          sessionId={sessionId}
        />
      )}
    </div>
  );
  // return (
  //   <div className="min-h-screen bg-gray-100 flex items-center justify-center font-inter p-4">
  //     {!showChatInterface ? (
  //       <PdfUpload
  //         onFileUploadSuccess={handleFileUploadSuccess}
  //         onPdfSelectedLocally={handlePdfSelectedLocally}
  //       />
  //     ) : (
  //       <PdfChatInterface pdfUrl={pdfUrl} onCloseChat={handleCloseChat} />
  //     )}
  //   </div>
  // );
}

export default App;
