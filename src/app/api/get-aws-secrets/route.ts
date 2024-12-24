import { NextResponse } from "next/server";
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({ region: "eu-west-1" });
const secret_name = "EventHero-Uploader"; // Name of the secret in Secrets Manager

export async function GET() {
  try {
    const data = await client.send(
      new GetSecretValueCommand({
        SecretId: secret_name,
        VersionStage: "AWSCURRENT", // Default is AWSCURRENT
      })
    );

    // Parse secret string if it's available
    const secret = data.SecretString ? JSON.parse(data.SecretString) : null;
    return NextResponse.json(secret);
  } catch (error) {
    console.error("Error fetching secret:", error);
    return NextResponse.json({ error: "Failed to retrieve secrets" }, { status: 500 });
  }
}
