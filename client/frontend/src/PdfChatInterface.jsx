import { Send, X, ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useRef, useEffect, useCallback } from "react";

import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// Configure the PDF.js worker path for react-pdf
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.js",
  import.meta.url
).toString();

const PdfChatInterface = ({
  pdfUrl,
  onCloseChat,
  extractedText,
  sessionId,
}) => {
  // useStates for chat functionality...
  const [chatInput, setChatInput] = useState(""); // holds the userInput text
  const [chatMessages, setChatMessages] = useState([]); // array holds the id, text, pageCitation and sender objects.

  // Ref to scroll the chat window to bottom automatically...

  const chatMessagesEndRef = useRef(null);

  // useState for pdf file viewer functionality...

  const [numPages, setNumPages] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageWidth, setPageWidth] = useState(null);

  // ref to the actual html div contains the pdf file viewer, to measure the width..

  const pdfContainerRef = useRef(null);

  // <-- Pdf loading and reponsive logic -->

  const onDocumentLoadSuccess = useCallback(({ numPages }) => {
    setNumPages(numPages);
    setCurrentPage(1);
  }, []);

  useEffect(() => {
    const updatePageWidth = () => {
      if (pdfContainerRef.current) {
        setPageWidth(pdfContainerRef.current.clientWidth * 0.9);
      }
    };

    updatePageWidth();

    // Add event listener fro the window resixe events..
    window.addEventListener("resize", updatePageWidth);
    return () => window.removeEventListener("resize", updatePageWidth);
  }, [pdfUrl]);

  // Handling page navigations next and previous..

  const jumpToPage = useCallback(
    (pageNumber) => {
      if (pageNumber >= 1 && pageNumber <= numPages) {
        setCurrentPage(pageNumber);
      }
    },
    [numPages]
  );

  // Logic to the Previous page navigation

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  //Logic to the next page navigation..

  const goToNextPage = () => {
    if (currentPage < numPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  // <-- Chat Interaction Logic -->

  useEffect(() => {
    if (chatMessagesEndRef.current) {
      chatMessagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatMessages]);

  // Handle sending a chat message..
  // <-- Placeholder for the AI Response (Later replaced by the AI backend logic-->
  const handleSendMessage = async () => {
    if (chatInput.trim() === "") return;

    const userMessage = {
      id: Date.now(),
      text: chatInput,
      sender: "user",
      pageCitation: null,
    };

    setChatMessages((prevMessages) => [...prevMessages, userMessage]);
    const currentChatInput = chatInput;
    setChatInput("");

    const API_BASE =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";
    try {
      const response = await fetch(`${API_BASE}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userQuery: currentChatInput,
          extractedText: extractedText,
          sessionId: sessionId,
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          const errorData = await response.json();
          throw new Error(
            errorData.message || `HTTP error! Status: ${response.status}`
          );
        } else {
          const errorText = await response.text();
          throw new Error(
            `HTTP error! Status: ${
              response.status
            }. Server response was not JSON: ${errorText.substring(0, 100)}...`
          );
        }
      }
      const result = await response.json();
      const aiResponseText = result.aiResponse;

      const pageMatch = aiResponseText.match(/\(Page (\d+)\)/);
      const pageNumber = pageMatch ? parseInt(pageMatch[1], 10) : null;

      // AI's response to chat history
      setChatMessages((prevMessages) => [
        ...prevMessages,
        {
          id: Date.now() + 1,
          text: aiResponseText.replace(/\(Page \d+\)/, "").trim(),
          sender: "ai",
          pageCitation: pageNumber,
        },
      ]);
    } catch (error) {
      console.error("Error fetching AI response: ", error);
      setChatMessages((prevMessages) => [
        ...prevMessages,
        {
          id: Date.now() + 1,
          text: "Sorry, encountered an error. Please try again.",
          sender: "ai",
          pageCitation: null,
        },
      ]);
    }
  };

  // Handle clicking on a citation button in the chat..

  const handleCitationClick = (pageNumber) => {
    if (jumpToPage && pageNumber) {
      jumpToPage(pageNumber);
    }
  };

  return (
    // Main container for the entire PDF Viewer + chat interface..
    <div className="flex w-full h-screen max-h-screen bg-white rounded-lg shadow-xl overflow-hidden">
      {/* Left Side view: pdf file viewer section */}
      <div
        ref={pdfContainerRef}
        className="relative w-1/2 h-full border-r border-gray-200 flex flex-col"
      >
        <div className="absolute top-2 right-2 z-10">
          <button
            onClick={onCloseChat}
            className="p-2 bg-gray-200 rounded-full text-gray-700 hover:bg-gray-300 transition duration-200"
            aria-label="Close PDF Viewer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-grow overflow-y-auto">
          {pdfUrl ? (
            // Document component loads the pdf file
            <Document
              onLoadSuccess={onDocumentLoadSuccess}
              file={pdfUrl}
              className="shadoww-md border border-gray-200 rounded-lg overflow-hidden"
              loading={<div className="text-gray-500 p-4">Loading PDF... </div>}
              error={
                <div className="text-red-500 p-4">Failed to Load PDF... </div>
              }
            >
              {/* The Page component renders the specific page */}
              <Page
                pageNumber={currentPage}
                width={pageWidth}
                renderAnnotationLayer={true}
                renderTextLayer={true}
              />
            </Document>
          ) : (
            <div className="text-gray-500 text-center p-4">No PDF loaded </div>
          )}
        </div>
        <div className="flex justify-center items-center p-2 bg-gray-100 border-b border-gray-200">
          <button
            onClick={goToPreviousPage}
            disabled={!numPages || currentPage <= 1}
            className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed transition duration-150"
            aria-label="Previous Page"
          >
            <ChevronLeft size={20} />
          </button>

          <span className="mx-4 text-gray-700 font-medium">
            {numPages ? `Page ${currentPage} of ${numPages}` : "Loading PDF..."}
          </span>

          <button
            onClick={goToNextPage}
            disabled={!numPages || currentPage >= numPages}
            className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-60 disabled:cursor-not-allowed transition duration-150"
            aria-label="Next Page"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* right side section: chat section */}
      <div className="w-1/2 h-full flex flex-col">
        {/* chat messages display area */}
        <div className="flex-grow p-4 overflow-y-auto bg-gray-50 custom-scrollbar">
          <div className="mb-4 text-center text-gray-500">
            You can now ask question about your document.For Example:
          </div>
          <ul className="list-disc list-inside text-purple-600 mb-6">
            <li>"What is the main topic of this document?"</li>
            <li>"Can you summarize the key points?"</li>
            <li>"What are the recommedations?"</li>
          </ul>

          {/* Chat messages will be dynamically rendered here */}

          {chatMessages.map((message) => (
            <div
              key={message.id}
              className={`flex mb-4 ${
                message.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[75%] p-3 rounded-lg shadow-md ${
                  message.sender === "user"
                    ? "bg-purple-600 text-white rounded-br-none"
                    : "bg-gray-200 text-gray-800 rounded-bl-none"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.text}</p>
                {message.pageCitation && (
                  <button
                    onClick={() => handleCitationClick(message.pageCitation)}
                    className="mt-2 text-sm bg-purple-200 text-purple-800 px-3 py-1 rounded-full hover:bg-purple-300 transition duration-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-1"
                  >
                    Page {message.pageCitation}
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* This div will be used for auto-scrolling the page */}
          <div ref={chatMessagesEndRef}></div>

          {/* Chat Input Area */}
          <div className="p-4 border-t border-gray-200 bg-white">
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Ask AI about the Document..."
                className="flex-grow p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              />
              <button
                onClick={handleSendMessage}
                className="p-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                aria-label="Send Message"
              >
                <Send size={24} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PdfChatInterface;
