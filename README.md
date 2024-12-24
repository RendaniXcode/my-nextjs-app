EventHero - S3 File Upload with AWS Secrets Manager

Project Overview

This mini project allows users to upload files (such as images and PDFs) to an Amazon S3 bucket. Instead of storing AWS credentials in `.env.local`, the project retrieves them dynamically from AWS Secrets Manager via a secure API. This approach ensures sensitive credentials are never exposed in the codebase, providing better security and scalability.

Key Features

File Upload to S3: Users can upload files to an S3 bucket.
Secure Credentials Management: AWS credentials are retrieved securely from AWS Secrets Manager.
Progress Feedback: Real-time progress updates on file uploads.
Error Handling: Clear error messages for failed uploads or missing credentials.
File Validation: Only image files (JPG, PNG) and PDFs are accepted for upload.

Technologies Used

Frontend: React (with Next.js)
AWS: AWS SDK for JavaScript (S3 and Secrets Manager)
Backend: Next.js API route to interact with AWS Secrets Manager
Environment: Next.js (React framework for server-side rendering)

Setup and Configuration

AWS Secrets Manager Setup
Store your AWS credentials (access keys, region, bucket name, etc.) in AWS Secrets Manager.
The secret should be a JSON object with the following structure:

```json
{
  "NEXT_PUBLIC_AWS_BUCKET_NAME": "your-s3-bucket-name",
  "NEXT_PUBLIC_AWS_REGION": "your-region",
  "NEXT_PUBLIC_AWS_ACCESS_KEY_ID": "your-access-key-id",
  "NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY": "your-secret-access-key",
  "NEXT_PUBLIC_AWS_ACCELERATE_ENDPOINT": "your-s3-accelerate-endpoint"
}
```

Secret Name: `EventHero-Uploader` (this can be customized)
IAM Permissions: Ensure that the IAM role or user accessing the secret has appropriate permissions to read the secret from Secrets Manager.

2.Setting Up Next.js Project

1. Install Dependencies:

   - Install necessary packages:

   ```bash
   npm install aws-sdk
   ```

Create API Route for AWS Secrets Fetching:
In your Next.js project, create an API route to fetch the secrets from AWS Secrets Manager:

```typescript
// src/app/api/get-aws-secrets/route.ts

import { NextResponse } from "next/server";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({ region: "your-region" });
const secret_name = "EventHero-Uploader";

export async function GET() {
  try {
	const data = await client.send(
  	new GetSecretValueCommand({
    	SecretId: secret_name,
    	VersionStage: "AWSCURRENT",  // Default version
  	})
	);

	const secret = data.SecretString ? JSON.parse(data.SecretString) : null;
	return NextResponse.json(secret);
  } catch (error) {
	console.error("Error fetching secret:", error);
	return NextResponse.json({ error: "Failed to retrieve secrets" }, { status: 500 });
  }
}
```

Frontend Implementation:

In your `src/app/page.tsx`, fetch the credentials from the API and use them in your AWS S3 configuration.

```typescript
// src/app/page.tsx

import { useState, useRef, useEffect } from "react";
import AWS from "aws-sdk";

export default function Home() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [awsCredentials, setAwsCredentials] = useState<any | null>(null);  // Store credentials from Secrets Manager
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
	// Fetch AWS credentials from the backend API
	const fetchAwsCredentials = async () => {
  	try {
    	const response = await fetch("/api/get-aws-secrets");
    	const data = await response.json();
    	if (data.error) {
      	throw new Error(data.error);
    	}
    	setAwsCredentials(data);
  	} catch (error) {
    	setMessage(`Error fetching AWS credentials: ${error.message}`);
  	}
	};

	fetchAwsCredentials();
  }, []);

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

	if (!awsCredentials) {
  	setMessage("AWS credentials not available.");
  	return;
	}

	setMessage(null);
	setProgress("0%");

	const { NEXT_PUBLIC_AWS_BUCKET_NAME, NEXT_PUBLIC_AWS_REGION, NEXT_PUBLIC_AWS_ACCESS_KEY_ID, NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY, NEXT_PUBLIC_AWS_ACCELERATE_ENDPOINT } = awsCredentials;

	AWS.config.update({
  	region: NEXT_PUBLIC_AWS_REGION,
  	accessKeyId: NEXT_PUBLIC_AWS_ACCESS_KEY_ID,
  	secretAccessKey: NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY,
	});

	const s3 = new AWS.S3({
  	endpoint: NEXT_PUBLIC_AWS_ACCELERATE_ENDPOINT,
  	s3BucketEndpoint: true,
	});

	const params = {
  	Bucket: NEXT_PUBLIC_AWS_BUCKET_NAME,
  	Key: `uploads/${selectedFile.name}`,
  	Body: selectedFile,
  	ACL: "public-read",
	};

	const upload = new AWS.S3.ManagedUpload({ params });

	upload.on("httpUploadProgress", (progress) => {
  	const percentage = Math.round((progress.loaded / progress.total) * 100);
  	setProgress(`${percentage}%`);
	});

	try {
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
  	setMessage(`Upload failed: ${error}`);
	}
  };

  return (
	<main className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
  	<div className="max-w-lg w-full bg-white p-8 rounded-lg shadow-lg">
    	<h1 className="text-3xl font-semibold text-center text-gray-800 mb-6">Upload Photo to S3</h1>

    	<input
      	type="file"
      	onChange={handleFileChange}
      	accept=".jpg,.jpeg,.png,.pdf"
      	className="block w-full text-gray-700 border border-gray-300 rounded-lg p-2 mb-4"
      	ref={fileInputRef}
    	/>
   	 
    	<button
      	onClick={uploadPhoto}
      	disabled={!selectedFile || !awsCredentials}
      	className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 mb-4"
    	>
      	Upload Photo
    	</button>

    	{progress && <p className="text-center text-gray-700">{progress}</p>}
    	{message && <p className={`text-center mt-2 ${message.includes('failed') ? 'text-red-500' : 'text-green-500'}`}>{message}</p>}
  	</div>
	</main>
  );
}
```
How It Works:

API Route (`/api/get-aws-secrets`):
The API fetches the AWS credentials from AWS Secrets Manager using the AWS SDK.
It responds with the credentials as a JSON object to the frontend.
   
Frontend:
The frontend makes a request to the `/api/get-aws-secrets` endpoint and retrieves the credentials.
These credentials are then used to configure the AWS SDK (S3) to upload files securely.

Deployment

1.Deploy to Vercel (or Other Platforms)
   - Deploy your Next.js project to Vercel or another hosting provider. Make sure the API route (`/api/get-aws-secrets`) works correctly by testing it in production.

2. IAM Role Configuration: If we use ec2 will give it access by attaching Role with permmision
   - Ensure that the IAM role associated with your Vercel project (or the environment where the Next.js app is hosted) has the necessary permissions to access AWS Secrets Manager.

Error Handling

Secrets Fetching Errors: If the secrets cannot be retrieved from AWS Secrets Manager, the API will return a `500` status with an error message.
Upload Errors: If the upload to S3 fails, the frontend will display the error message received from AWS.

Security Considerations

Sensitive Data: Ensure that AWS credentials are never exposed in the frontend code. Always fetch credentials from the backend API (which fetches from Secrets Manager).
Permissions: The IAM user or role fetching the secrets must have read access to AWS Secrets Manager, and the credentials should be restricted to only necessary permissions.

Next Steps

1. Integrate into Main Project: This mini-project can be integrated into your main EventHero project for file uploads.
2. Enhance Features:
   - Add support for multiple file uploads.
   - Improve error handling and add user-friendly messages.
   - Implement file size and type validation.
3. Improve Security:
   - Use environment variables for non-sensitive configuration (e.g., S3 region).
   - Ensure secure access to the AWS API and credentials.

-Conclusion

This setup ensures that AWS credentials are handled securely using **AWS Secrets Manager** and are used in a Next.js app for file uploads to S3. The architecture is scalable, secure, and suitable for production environments.
