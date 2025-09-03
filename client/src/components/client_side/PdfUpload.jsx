import { Upload } from "lucide-react";
import { useState } from "react";

const PdfUpload = ({ onFileUploadSuccess, onPdfSelectedLocally }) => {
  const [selectedFile, setSelectedFile] = useState(null); // Tracks the selected file
  const [FileUploadProgress, setFileUploadProgress] = useState(0); // tracks the upload percentage
  const [isUploading, setIsUploading] = useState(false); // tracks if the upload is active or not
  const [uploadedFileUrl, setUploadedFileUrl] = useState(null);
  const [uploadError, setUploadError] = useState(null); // Displays the errors...

  // Common logic on selecting file for drag, drop and input change....
  const processedFile = (file, errorMessage) => {
    const isPdf =
      file &&
      (file.type === "application/pdf" ||
        file.name?.toLowerCase().endsWith(".pdf"));

    if (isPdf) {
      setSelectedFile(file);
      setUploadError(null);
      const localUrl = URL.createObjectURL(file);
      onPdfSelectedLocally?.(localUrl);
    } else {
      setSelectedFile(null);
      setUploadError(errorMessage);
      onPdfSelectedLocally?.(null);
    }
  };

  // Event Handlers...

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    console.log("File Selected: ", file?.name);
    processedFile(file, "Please select a valid pdf file");
  };
  const handleDrop = (e) => {
    e.preventDefault(); // stops teh browser from opening the file
    const file = e.dataTransfer.files?.[0];
    console.log("File Dropped: ", file?.name);
    processedFile(file, "Please drop a valid pdf file");
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  // code for the uploading the doc and progress bar component..
  // Below code is written for connection with backend...
  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError("No PDF file selected for upload");
      return;
    }

    // Initiazise the upload factors...

    setIsUploading(true);
    setFileUploadProgress(0);
    setUploadError(null);

    const formData = new FormData(); // Create formData object for file upload,formData is used to represent the inner content of the file ratherthan jus the schema or outer file type
    formData.append("pdfFile", selectedFile);

    let progressTimer;
    try {
      let currentProgress = 0;
      progressTimer = setInterval(() => {
        currentProgress += 10;
        if (currentProgress <= 90) {
          // Here the timer stops at 90%
          setFileUploadProgress(currentProgress);
        } else {
          clearInterval(progressTimer);
        }
      }, 200);

      const response = await fetch("http://localhost:5000/upload-pdf", {
        method: "POST",
        body: formData,
      });

      clearInterval(progressTimer);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `HTTP error! Status: ${response.status}`
        );
      }

      const result = await response.json();
      console.log("Upload Successfull: ", result);
      setFileUploadProgress(100);
      setIsUploading(false);
      onFileUploadSuccess(
        URL.createObjectURL(selectedFile),
        result.extractedText
      );
    } catch (error) {
      console.error("Error uploading file:", error);
      setUploadError("Failed to upload the file: " + error.message);
      setFileUploadProgress(0);
      setIsUploading(false);
    } finally {
      if (progressTimer) clearInterval(progressTimer);
      setIsUploading(false);
    }
  };

  // <-- The below code is used to test the frontend part of this project/ manual pdf local storage -->
  // const handleUpload = () => {
  //   // Check if a file is selected before proceeding.
  //   if (!selectedFile) {
  //     setError("Please select a PDF file first.");
  //     return;
  //   }

  //   setIsUploading(true);
  //   setUploadError(null);

  //   try {
  //     // Create a temporary URL for the selected file.
  //     // This URL allows the browser to access the file from local memory.
  //     const localFileUrl = URL.createObjectURL(selectedFile);
  //     console.log("Local File URL created for testing:", localFileUrl);

  //     // Call the prop to pass the local URL to the parent component.
  //     onPdfSelectedLocally(localFileUrl);

  //     // Transition to the chat interface once the URL is available.
  //     onFileUploadSuccess();
  //   } catch (err) {
  //     console.error("Local file handling error:", err);
  //     setError("An error occurred while preparing the file for viewing.");
  //   } finally {
  //     // Set loading to false after a slight delay to simulate an upload.
  //     // This allows us to see the loading state.
  //     setTimeout(() => {
  //       setIsUploading(false);
  //     }, 500);
  //   }
  // };

  return (
    <div className="flex flex-col items-center justify-center p-10 rounded-2xl bg-white shadow-lg text-center w-full max-w-md">
      {uploadError && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg w-full">
          {uploadError}
        </div>
      )}

      {!selectedFile && !isUploading && (
        <div
          className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-purple-300 rounded-2xl bg-gray-50 hover:bg-gray-100 transition duration-200 cursor-pointer w-full"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => document.getElementById("fileInput").click()}
        >
          <Upload className="w-16 h-16 text-purple-600 mb-4" />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Upload pdf to start chatting
          </h2>
          <p className="text-gray-500">Click or drag and drop your file</p>
          <input
            type="file"
            id="fileInput"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {selectedFile && !isUploading && (
        <>
          <p className="text-lg font-medium text-gray-700 mb-4 truncate w-full px-2">
            Fileselected
            <span className="font-bold">{selectedFile.name}</span>
          </p>
          <button
            onClick={handleUpload}
            className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 w-full"
          >
            Start Uploading
          </button>
        </>
      )}

      {isUploading && (
        <div className="flex flex-col items-center justify-center w-full">
          <div className="relative w-full h-3 bg-gray-200 rounded-full mb-4 overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-purple-600 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${FileUploadProgress}%` }}
            ></div>
          </div>
          <p className="text-lg font-medium text-gray-700">Uploading PDF....</p>
          <p className="text-2xl font-bold text-purple-600 mt-2">
            {FileUploadProgress}%
          </p>
        </div>
      )}
    </div>
  );
};

export default PdfUpload;
