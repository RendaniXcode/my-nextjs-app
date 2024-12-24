"use client";

import { useState, useRef } from "react";
import AWS from "aws-sdk";

// Create an async function to fetch secrets from AWS Secrets Manager
const fetchSecrets = async () => {
  const response = await fetch("/api/get-aws-secrets"); // You will create an API route for this
  const secrets = await response.json();
  return secrets;
};

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
    }
  };

  const uploadPhoto = async () => {
    if (!selectedFile) {
      setMessage("Please select a file to upload.");
      return;
    }

    setMessage(null);
    setProgress("0%");

    try {
      // Fetch the AWS credentials from the server
      const secrets = await fetchSecrets();

      const { AWS_BUCKET_NAME, AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_ACCELERATE_ENDPOINT } = secrets;

      AWS.config.update({
        region: AWS_REGION,
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      });

      const s3 = new AWS.S3({
        endpoint: AWS_ACCELERATE_ENDPOINT,
        s3BucketEndpoint: true,
      });

      const params = {
        Bucket: AWS_BUCKET_NAME,
        Key: `uploads/${selectedFile.name}`,
        Body: selectedFile,
        ACL: "public-read",
      };

      const upload = new AWS.S3.ManagedUpload({ params });

      upload.on("httpUploadProgress", (progress) => {
        const percentage = Math.round((progress.loaded / progress.total) * 100);
        setProgress(`${percentage}%`);
      });

      await upload.promise();
      setMessage("File uploaded successfully!");

      setTimeout(() => {
        setSelectedFile(null);
        setProgress(null);
        setMessage(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }, 2000);
    } catch (error) {
      setMessage(`Upload failed: ${error.message}`);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="max-w-lg w-full bg-white p-8 rounded-lg shadow-lg">
        <h1 className="text-3xl font-semibold text-center text-gray-800 mb-6">Upload Photo to S3</h1>

        {/* File input allows only images (JPG, PNG) and PDFs */}
        <input
          type="file"
          onChange={handleFileChange}
          accept=".jpg,.jpeg,.png,.pdf"
          className="block w-full text-gray-700 border border-gray-300 rounded-lg p-2 mb-4"
          ref={fileInputRef}
        />
        
        <button
          onClick={uploadPhoto}
          disabled={!selectedFile}
          className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 mb-4"
        >
          Upload Photo
        </button>

        {/* Progress display */}
        {progress && <p className="text-center text-gray-700">{progress}</p>}

        {/* Success or error message */}
        {message && <p className={`text-center mt-2 ${message.includes('failed') ? 'text-red-500' : 'text-green-500'}`}>{message}</p>}
      </div>
    </main>
  );
}
